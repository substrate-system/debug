import Debug from '../src/browser/index.js'
import { noop } from '../src/noop.js'
import { type Debugger } from '../src/index.js'

console.log('import meta env', import.meta.env)
console.log('is dev???', import.meta.env.DEV)

const debug = Debug('fooo')

localStorage.setItem('DEBUG', 'abc:*')

let dynamicDebugger:Debugger

if (import.meta.env.DEV) {
    const { createDebug } = (await import('../src/browser/index.js'))
    dynamicDebugger = createDebug('abc:123')
} else {
    dynamicDebugger = noop
}

dynamicDebugger('hello dynamic imports')

debug('debug works')

const debug3 = Debug('barrr')
debug3('barrrrr')

const debug4 = Debug('bazzz')
debug4('bazzzzzzz')  // should not log

// testing the * variable
const debug7 = Debug('quxxx')
debug7('hello quxxx')

const debug8 = Debug('foo-bar')

debug8('hello eight')

// testing boolean true - should always log regardless of localStorage
const debugForced = Debug(true)
debugForced('This should always log because we passed boolean true!')

// testing boolean false - should return noop
const debugNoop = Debug(false)
debugNoop('This should never log because we passed boolean false!')
