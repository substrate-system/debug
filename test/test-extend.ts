import { test } from '@substrate-system/tapzero'
import createDebug from '../src/node/index.js'

test('create debug instance with extended namespaces', async t => {
    // Test the extend functionality
    const log = createDebug('auth')
    const logSign = log.extend('sign')

    // Test that extend method exists
    t.ok(typeof log.extend === 'function',
        'debug instance should have extend method')
    t.ok(typeof logSign.extend === 'function',
        'extended debug instance should also have extend method')

    // Test chained extending
    const logSignVerbose = logSign.extend('verbose')
    t.ok(typeof logSignVerbose === 'function',
        'chained extend should return a function')
    t.ok(typeof logSignVerbose.extend === 'function',
        'chained extended instance should have extend method')
})

test('extend method preserves env parameter in Node.js', async t => {
    const customEnv = { DEBUG: 'test:*' }
    const log = createDebug('test', customEnv)
    const logExtended = log.extend('child')

    t.ok(typeof logExtended === 'function',
        'extended debug with custom env should be a function')
    t.ok(typeof logExtended.extend === 'function',
        'extended debug should have extend method')
})
