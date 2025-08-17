import { test } from '@substrate-system/tapzero'
import createDebug from '../src/node.js'

let debug
test('createDebug', t => {
    debug = createDebug('test')
    debug('trying things')
    t.ok(true, "logged something and didn't throw")
})

test('Log another namespace. Should not see this.', t => {
    const debug = createDebug('fooo')
    debug('hello')
    t.ok(true, 'did not throw')
})

test('with NODE_ENV=development', t => {
    const debug = createDebug()
    debug('testing the env var')
    t.ok('should log if NODE_ENV=development')
})

test('pass in an env variable', t => {
    const debug = createDebug(null, { NODE_ENV: 'test' })
    t.ok(debug, 'should return a new instance')
    debug('test env var')
})
