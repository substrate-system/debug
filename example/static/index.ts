import Debug from '../../src/browser/index.js'

const debug = Debug()

const debugTwo = Debug('aaa', { DEBUG: 'aaa' })

debugTwo('debugging aaa')

const debugThree = Debug(true)

debugThree('three')

// @ts-expect-error dev
window.debug = debug

debug('hello')

setTimeout(() => {
    debug('hello again, same color')
}, 1000)

debugTwo('...aaa again')
