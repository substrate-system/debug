/**
 * Test for Cloudflare Workers environment.
 * This test should run in an actual Workers-like environment,
 * not just a browser with mocked localStorage.
 */

// Simulate Cloudflare Workers global environment
const originalLog = console.log.bind(console)

// Clear browser-specific globals to simulate Workers environment
delete (globalThis as any).localStorage
delete (globalThis as any).document
delete (globalThis as any).navigator
delete (globalThis as any).window

// Set up Workers-like environment BEFORE importing the module
let testConsoleOutput: string[] = []
console.log = (...args: any[]) => {
    // Capture console output for testing
    const output = args.join(' ')
    testConsoleOutput.push(output)
    // Also log to original console for visibility
    originalLog(...args)
}

// Mock process for testing with environment variables
;(globalThis as any).process = {
    env: {}
}

// Dynamic import AFTER setting up console mock
const { default: createDebugCF } = await import('../src/cloudflare/index.js')

// Simple test framework since we can't use tapzero in Workers
class CloudflareTest {
    private testCount = 0
    private passCount = 0
    private failures: string[] = []

    ok (condition: boolean, message: string) {
        this.testCount++
        if (condition) {
            this.passCount++
            console.log(`ok ${this.testCount} ${message}`)
        } else {
            this.failures.push(`not ok ${this.testCount} ${message}`)
            console.log(`not ok ${this.testCount} ${message}`)
        }
    }

    fail (message: string) {
        this.ok(false, message)
    }

    end () {
        console.log(`\n1..${this.testCount}`)
        console.log(`# tests ${this.testCount}`)
        console.log(`# pass  ${this.passCount}`)

        if (this.failures.length > 0) {
            console.log(`# fail  ${this.failures.length}`)
            this.failures.forEach(failure => console.log(failure))
            console.log('\n# not ok')
        } else {
            console.log('\n# ok')
        }
    }

    clearConsoleOutput () {
        testConsoleOutput = []
    }

    getConsoleOutput (): string[] {
        // Return a copy to avoid pollution from subsequent console.log calls
        return [...testConsoleOutput]
    }
}

function runCloudflareTests () {
    const t = new CloudflareTest()

    // Test 1: Module import
    t.ok(typeof createDebugCF === 'function',
        'Cloudflare debug module should export a function')

    // Test 2: Basic debug creation
    const debug = createDebugCF('worker:test')
    t.ok(typeof debug === 'function', 'createDebug should return a function')
    t.ok(typeof debug.extend === 'function', 'debug should have extend method')

    // Test 3: Debug with boolean false (noop)
    const noopDebug = createDebugCF(false)
    t.ok(typeof noopDebug === 'function', 'noop debug should be a function')
    t.ok(typeof noopDebug.extend === 'function',
        'noop debug should have extend method')

    // Test 4: Force enabled debug (should always log)
    t.clearConsoleOutput()
    const forceDebug = createDebugCF(true)
    forceDebug('forced message in workers')
    const output = t.getConsoleOutput()
    console.log('DEBUG: captured output:', output) // Debug line
    t.ok(output.length > 0, 'Forced debug should produce output')
    if (output.length > 0) {
        t.ok(output[0].includes('forced message in workers'),
            'Output should contain the message')
    } else {
        t.fail('No output captured from forced debug')
    }

    // Test 5: Debug with wildcard DEBUG environment
    t.clearConsoleOutput()
    ;(globalThis as any).process.env.DEBUG = '*'
    const wildcardDebug = createDebugCF('any:namespace')
    wildcardDebug('wildcard test message')
    const wildcardOutput = t.getConsoleOutput()
    t.ok(wildcardOutput.length > 0, 'Wildcard DEBUG should enable logging')
    t.ok(wildcardOutput[0].includes('wildcard test message'),
        'Should log with wildcard pattern')

    // Test 6: Debug with specific namespace pattern
    t.clearConsoleOutput()
    ;(globalThis as any).process.env.DEBUG = 'worker:*'
    const specificDebug = createDebugCF('worker:handler')
    const otherDebug = createDebugCF('other:service')
    specificDebug('should log')
    otherDebug('should not log')
    const specificOutput = t.getConsoleOutput()
    t.ok(specificOutput.length === 1, 'Only matching namespace should log')
    t.ok(specificOutput[0].includes('should log'), 'Matching namespace should log')

    // Test 7: Extend functionality
    t.clearConsoleOutput()
    ;(globalThis as any).process.env.DEBUG = '*'
    const baseDebug = createDebugCF('auth')
    const extendedDebug = baseDebug.extend('login')
    const chainedDebug = extendedDebug.extend('oauth')

    baseDebug('base message')
    extendedDebug('extended message')
    chainedDebug('chained message')

    const extendOutput = t.getConsoleOutput()
    t.ok(extendOutput.length === 3, 'All extended debuggers should log')
    t.ok(extendOutput[0].includes('auth'),
        'Base debug should include base namespace')
    t.ok(extendOutput[1].includes('auth:login'),
        'Extended debug should include extended namespace')
    t.ok(extendOutput[2].includes('auth:login:oauth'),
        'Chained debug should include full namespace chain')

    // Test 8: Formatting in Workers
    t.clearConsoleOutput()
    const formatDebug = createDebugCF(true)  // Force enabled
    formatDebug('String: %s, Number: %d, JSON: %j', 'cloudflare', 42, {
        worker: true
    })
    const formatOutput = t.getConsoleOutput()
    t.ok(formatOutput.length > 0, 'Formatting should work in Workers')
    t.ok(formatOutput[0].includes('cloudflare'), 'String formatting should work')
    t.ok(formatOutput[0].includes('42'), 'Number formatting should work')
    t.ok(formatOutput[0].includes('{"worker":true}'), 'JSON formatting should work')

    // Test 9: No DEBUG environment (should not log unless forced)
    t.clearConsoleOutput()
    delete (globalThis as any).process.env.DEBUG
    const noEnvDebug = createDebugCF('test:namespace')
    noEnvDebug('should not log')
    const noEnvOutput = t.getConsoleOutput()
    t.ok(noEnvOutput.length === 0, 'Should not log without DEBUG environment')

    // Test 11: Works without process.env (pure Workers environment)
    t.clearConsoleOutput()
    delete (globalThis as any).process
    const pureWorkersDebug = createDebugCF(true)  // Force enabled
    pureWorkersDebug('pure workers message')
    const pureOutput = t.getConsoleOutput()
    t.ok(pureOutput.length > 0,
        'Should work without process.env in pure Workers')

    // Test 12: Global DEBUG variable support
    t.clearConsoleOutput()
    ;(globalThis as any).DEBUG = 'global:*'
    const globalDebug = createDebugCF('global:test')
    globalDebug('global debug message')
    const globalOutput = t.getConsoleOutput()
    t.ok(globalOutput.length > 0, 'Should support global DEBUG variable')

    t.end()
}

// Run the tests
console.log('TAP version 13')
console.log('# Cloudflare Workers Debug Tests')
runCloudflareTests()
