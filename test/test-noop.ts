import { test } from '@substrate-system/tapzero'
import createDebugNoop from '../src/noop.js'

/**
 * Tests that the noop module can be used as a drop-in replacement
 * for the main debug module. This is important for production builds
 * that alias @substrate-system/debug to @substrate-system/debug/noop.
 */

test('noop module exports a factory function like the main module', async t => {
    t.ok(typeof createDebugNoop === 'function',
        'noop default export should be a function (factory)')
})

test('noop factory returns a debugger instance', async t => {
    const debug = createDebugNoop('test:namespace')

    t.ok(typeof debug === 'function',
        'calling noop factory should return a function')
})

test('noop debugger has extend method', async t => {
    const debug = createDebugNoop('test')

    t.ok(typeof debug.extend === 'function',
        'noop debugger should have extend method')
})

test('noop debugger extend returns another debugger', async t => {
    const debug = createDebugNoop('test')
    const extended = debug.extend('child')

    t.ok(typeof extended === 'function',
        'extend should return a function')
    t.ok(typeof extended.extend === 'function',
        'extended debugger should also have extend method')
})

test('noop debugger can be called without errors', async t => {
    const debug = createDebugNoop('test')

    // Should not throw
    debug('hello world')
    debug('formatted %s', 'string')
    debug({ object: 'test' })

    t.ok(true, 'calling noop debugger should not throw')
})

test('noop module matches main module API', async t => {
    // This test ensures the noop module can be aliased
    // in vite/webpack configs like:
    // resolve: {
    //   alias: {
    //     '@substrate-system/debug': mode === 'production'
    //       ? '@substrate-system/debug/noop'
    //       : '@substrate-system/debug'
    //   }
    // }

    const debug = createDebugNoop('myapp')
    const debugChild = debug.extend('module')
    const debugGrandchild = debugChild.extend('submodule')

    // All of these should work without errors
    debug('main message')
    debugChild('child message')
    debugGrandchild('grandchild message')

    t.ok(true, 'noop module should be usable as drop-in replacement')
})
