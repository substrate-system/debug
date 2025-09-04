import { createDebug } from '../src/node/index.js'

const debug = createDebug()

debug('hello')

const debug2 = createDebug('hello:abc')

debug2('hello again')

const debug3 = createDebug('abc123:456')

debug3('hello number three')
