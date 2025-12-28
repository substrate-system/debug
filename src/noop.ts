import { type Debugger } from './index.js'

export const noop:Debugger = function (_args:any[]) {}
noop.extend = function (_namespace:string) { return noop }

/**
 * Factory function that matches the main module's API.
 * Always returns the noop debugger regardless of namespace.
 */
export function createDebug (_namespace?:string|boolean):Debugger {
    return noop
}

export default createDebug
