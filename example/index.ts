import Debug from '../src/browser/index.js'

console.log('import meta env', import.meta.env)
console.log('is dev???', import.meta.env.DEV)

const debug = Debug('fooo')

debug('debug works')

const debug2 = Debug()

debug2('testing debug 2')

setTimeout(() => {
    debug2('log again in debug 2')
}, 1000)

const debug3 = Debug('barrr')
debug3('barrrrr')

const debug4 = Debug('bazzz')
debug4('bazzzzzzz')  // should not log

const debug5 = Debug()
debug5("debug 5 should be a different color, because it's a different instance.")

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
