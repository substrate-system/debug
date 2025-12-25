import { type Debugger } from './index.js'

export const noop:Debugger = function (_args:any[]) {}
noop.extend = function (_namespace:string) { return noop }
export default noop
