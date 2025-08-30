import { createDebug } from '../src/node.js'

const debug = createDebug()

debug('hello')

const debug2 = createDebug('hello:abc')

debug2('hello again')
