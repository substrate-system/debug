import { test } from '@substrate-system/tapzero'
import createDebug from '../src/browser/index.js'

// Mock localStorage for testing
const mockLocalStorage = (() => {
    let store: Record<string, string> = {}
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value
        },
        removeItem: (key: string) => {
            delete store[key]
        },
        clear: () => {
            store = {}
        }
    }
})()

// Replace localStorage with our mock
Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true
})

test('Browser debug module can be imported', t => {
    t.ok(typeof createDebug === 'function', 'createDebug should be a function')
})

test('Browser debug creates function', t => {
    const debug = createDebug('test')
    t.ok(typeof debug === 'function', 'debug should be a function')
})

test('Browser debug with boolean false returns noop', t => {
    const debug = createDebug(false)
    t.ok(typeof debug === 'function',
        'debug should be a function even when disabled')
    // We can't really test that it's a noop without checking internals
})

test('Browser debug basic functionality test', t => {
    // Test various scenarios to ensure they don't throw errors
    mockLocalStorage.setItem('DEBUG', 'test')

    const debug1 = createDebug('test')
    const debug2 = createDebug('other')
    const debug4 = createDebug(true)
    const debug5 = createDebug(false)

    // These should not throw errors
    try {
        debug1('test message 1')
        debug2('test message 2')
        debug4('test message 4')
        debug5('test message 5')
        t.ok(true, 'All debug calls completed without throwing')
    } catch (err) {
        t.fail(`Debug calls should not throw: ${err}`)
    }

    mockLocalStorage.clear()
})

test('Browser debug with wildcard pattern', t => {
    mockLocalStorage.setItem('DEBUG', '*')

    const debug = createDebug('anything')

    try {
        debug('wildcard test message')
        t.ok(true, 'Wildcard debug call completed without throwing')
    } catch (err) {
        t.fail(`Wildcard debug call should not throw: ${err}`)
    }

    mockLocalStorage.clear()
})

test('Browser debug with namespace patterns', t => {
    mockLocalStorage.setItem('DEBUG', 'app:*')

    const debug1 = createDebug('app:user')
    const debug2 = createDebug('other:thing')

    try {
        debug1('app user message')
        debug2('other thing message')
        t.ok(true, 'Namespace pattern debug calls completed without throwing')
    } catch (err) {
        t.fail(`Namespace pattern debug calls should not throw: ${err}`)
    }

    mockLocalStorage.clear()
})

test('Browser debug with multiple namespaces', t => {
    mockLocalStorage.setItem('DEBUG', 'app,test,utils')

    const debugApp = createDebug('app')
    const debugTest = createDebug('test')
    const debugUtils = createDebug('utils')
    const debugOther = createDebug('other')

    try {
        debugApp('app message')
        debugTest('test message')
        debugUtils('utils message')
        debugOther('other message')
        t.ok(true, 'Multiple namespace debug calls completed without throwing')
    } catch (err) {
        t.fail(`Multiple namespace debug calls should not throw: ${err}`)
    }

    mockLocalStorage.clear()
})

test('Browser debug formatting', t => {
    mockLocalStorage.setItem('DEBUG', 'format')

    const debug = createDebug('format')

    try {
        debug('String formatting: %s', 'test')
        debug('Number formatting: %d', 42)
        debug('JSON formatting: %j', { key: 'value' })
        debug('Object formatting: %o', { nested: { data: true } })
        t.ok(true, 'All formatting debug calls completed without throwing')
    } catch (err) {
        t.fail(`Formatting debug calls should not throw: ${err}`)
    }

    mockLocalStorage.clear()
})

test('Browser debug exclusion patterns', t => {
    mockLocalStorage.setItem('DEBUG', 'worker:*,-worker:idle')

    const debugWorkerActive = createDebug('worker:active')
    const debugWorkerIdle = createDebug('worker:idle')
    const debugWorkerBusy = createDebug('worker:busy')

    try {
        debugWorkerActive('worker is active')
        debugWorkerIdle('worker is idle')  // This should be excluded
        debugWorkerBusy('worker is busy')
        t.ok(true, 'Exclusion pattern debug calls completed without throwing')
    } catch (err) {
        t.fail(`Exclusion pattern debug calls should not throw: ${err}`)
    }

    mockLocalStorage.clear()
})

test('Browser debug forced enabled and disabled', t => {
    mockLocalStorage.clear()

    const debugForced = createDebug(true)
    const debugDisabled = createDebug(false)

    try {
        debugForced('forced message')
        debugDisabled('disabled message')
        t.ok(true, 'Forced and disabled debug calls completed without throwing')
    } catch (err) {
        t.fail(`Forced and disabled debug calls should not throw: ${err}`)
    }
})
