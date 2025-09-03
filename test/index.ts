import { test } from '@substrate-system/tapzero'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { writeFileSync, unlinkSync } from 'node:fs'
import './test-extend.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// path to built node.js file
const nodeJsPath = resolve(process.cwd(), 'dist/node/index.js')

test('Logs to stderr when namespace matches DEBUG env var', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const debug = createDebug('test')
        debug('hello world')
    `

    const { stderr } = await runChildProcess(code, { DEBUG: 'test' })
    t.ok(stderr.includes('hello world'), 'Should log to stderr when DEBUG=test')
    t.ok(stderr.includes('test'), 'Should include namespace in output')
})

test('Does not log when namespace does not match DEBUG env var', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const debug = createDebug('test')
        debug('hello world')
    `

    const { stderr } = await runChildProcess(code, { DEBUG: 'other' })
    t.ok(!stderr.includes('hello world'), 'Should not log when DEBUG=other')
})

test('Wildcard DEBUG env var', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const debug = createDebug('test:foo')
        debug('wildcard test')
    `

    const { stderr } = await runChildProcess(code, { DEBUG: 'test:*' })
    t.ok(stderr.includes('wildcard test'), 'Should log with wildcard pattern')
})

test('Multiple namespaces in DEBUG env var', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const debug1 = createDebug('app')
        const debug2 = createDebug('test')
        debug1('from app')
        debug2('from test')
    `

    const { stderr } = await runChildProcess(code, { DEBUG: 'app,test' })
    t.ok(stderr.includes('from app'), 'Should log from app namespace')
    t.ok(stderr.includes('from test'), 'Should log from test namespace')
})

test('Debug with env object parameter - matching namespace', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const debug = createDebug('mytest', { DEBUG: 'mytest' })
        debug('env object test')
    `

    const { stderr } = await runChildProcess(code)
    t.ok(stderr.includes('env object test'),
        'Should log when env object has matching DEBUG')
})

test('env object parameter - non-matching namespace', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const debug = createDebug('mytest', { DEBUG: 'other' })
        debug('should not appear')
    `

    const { stderr } = await runChildProcess(code)
    t.ok(!stderr.includes('should not appear'),
        'Should not log when env object DEBUG does not match')
})

test('Without namespace in development mode', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const debug = createDebug()
        debug('dev mode logging')
    `

    const { stderr } = await runChildProcess(code, { NODE_ENV: 'development' })
    t.ok(stderr.includes('dev mode logging'),
        'Should log in development mode without namespace')
})

test('Without namespace in production mode', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const debug = createDebug()
        debug('should not appear')
    `

    const { stderr } = await runChildProcess(code, { NODE_ENV: 'production' })
    t.ok(!stderr.includes('should not appear'),
        'Should not log in production mode without namespace')
})

test('With env object NODE_ENV=test', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const debug = createDebug(null, { NODE_ENV: 'test' })
        debug('test env mode')
    `

    const { stderr } = await runChildProcess(code)
    t.ok(stderr.includes('test env mode'),
        'Should log when NODE_ENV=test in env object')
})

test('Format with multiple arguments', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const debug = createDebug('format')
        debug('User %s has %d points', 'alice', 42)
    `

    const { stderr } = await runChildProcess(code, { DEBUG: 'format' })
    t.ok(stderr.includes('User alice has 42 points'),
        'Should format arguments correctly')
})

test('Node.js debug with object formatting', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const debug = createDebug('object')
        debug('Object: %o', { name: 'test', value: 123 })
    `

    const { stderr } = await runChildProcess(code, { DEBUG: 'object' })
    t.ok(stderr.includes('name'), 'Should include object properties')
    t.ok(stderr.includes('test'), 'Should include object values')
})

test('extend method', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const log = createDebug('auth')
        const logSign = log.extend('sign')
        const logLogin = log.extend('login')
        
        log('base auth')
        logSign('signing in')
        logLogin('logging in')
        
        // Test chained extending
        const logSignVerbose = logSign.extend('verbose')
        logSignVerbose('verbose sign')
    `

    const { stderr } = await runChildProcess(code, { DEBUG: 'auth:*' })
    t.ok(stderr.includes('auth:sign signing in'),
        'Should log from extended namespace')
    t.ok(stderr.includes('auth:login logging in'),
        'Should log from another extended namespace')
    t.ok(stderr.includes('auth:sign:verbose verbose sign'),
        'Should support chained extending')
    t.ok(!stderr.includes('base auth'),
        'Base namespace should not match auth:* pattern')
})

test('extend method with wildcard DEBUG pattern', async t => {
    const code = `
        import createDebug from '${nodeJsPath}'
        const log = createDebug('app')
        const logExtended = log.extend('module')
        
        log('base message')
        logExtended('extended message')
    `

    const { stderr } = await runChildProcess(code, { DEBUG: '*' })
    t.ok(stderr.includes('app base message'),
        'Should log base namespace with wildcard')
    t.ok(stderr.includes('app:module extended message'),
        'Should log extended namespace with wildcard')
})

// Helper function
// run a child process and capture output
function runChildProcess (
    code:string,
    env:Record<string, string> = {}
):Promise<{ stdout:string, stderr:string }> {
    return new Promise((resolve, reject) => {
        // Create a temporary file
        const tempFile = join(__dirname, `temp-test-${Date.now()}.mjs`)

        try {
            writeFileSync(tempFile, code)

            const child = spawn('node', [tempFile], {
                env: { ...process.env, ...env },
                stdio: ['pipe', 'pipe', 'pipe']
            })

            let stdout = ''
            let stderr = ''

            child.stdout.on('data', (data) => {
                stdout += data.toString()
            })

            child.stderr.on('data', (data) => {
                stderr += data.toString()
            })

            child.on('close', (code) => {
                try {
                    unlinkSync(tempFile)
                } catch (_) {
                    // Ignore cleanup errors
                }

                if (code === 0) {
                    resolve({ stdout, stderr })
                } else {
                    reject(new Error(`Process exited with code ${code}. ` +
                        `stderr: ${stderr}`))
                }
            })

            child.on('error', (err) => {
                try {
                    unlinkSync(tempFile)
                } catch (_) {
                    // Ignore cleanup errors
                }
                reject(err)
            })
        } catch (err) {
            reject(err)
        }
    })
}
