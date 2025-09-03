import { type Debugger } from './common.js'

export const noop:Debugger = function (_args:any[]) {}
noop.extend = function (_namespace:string) { return noop }

