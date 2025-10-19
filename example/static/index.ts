import Debug from '../../src/browser/index.js'

const debugTwo = Debug('aaa')

debugTwo('debugging aaa')

const debugThree = Debug(true)

debugThree('three')

const debugFalse = Debug(false)
debugFalse('should not see this')

// @ts-expect-error dev
window.debug = debug

debugTwo('...aaa again')

// need to use the boolean coersion, else it will pass in `undefined`
const debugFive = Debug(!!(import.meta.env && import.meta.env.DEV))

// will not see this
debugFive('five!')
