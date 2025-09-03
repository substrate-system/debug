import humanize from '../ms.js'
import {
    generateRandomString,
    coerce,
    selectColor,
    createRegexFromEnvVar,
    type Debugger
} from '../common.js'
import { noop } from '../noop.js'

// Cloudflare Workers have a limited set of Web APIs
// No localStorage, document, or navigator
const log = console.log || (() => {})

// Simple color palette for Cloudflare Workers (no DOM-based colors)
const colors = [
    '#0066CC', '#CC0066', '#66CC00', '#CC6600', '#6600CC', '#00CC66',
    '#CC0000', '#0000CC', '#00CCCC', '#CCCC00', '#CC00CC', '#666666'
]

export { createDebug }
export default createDebug

/**
 * Check if the given namespace is enabled in Cloudflare Workers.
 * Since there's no localStorage, we check environment variables or global DEBUG.
 * `namespace` is the name that is passed into debug.
 * `env` is an optional environment object that can contain DEBUG setting.
 */
function isEnabled (namespace:string, env?:Record<string, string>):boolean {
    // Determine the DEBUG value from env parameter, global, or process.env
    const DEBUG = env?.DEBUG ||
                  (typeof globalThis !== 'undefined' && (globalThis as any).DEBUG) ||
                  (typeof process !== 'undefined' && process.env?.DEBUG)

    // If no namespace (DEV mode), check if there's no DEBUG variable
    if (namespace === 'DEV') {
        // We want to log iff there is no DEBUG variable.
        if (!DEBUG) {
            return true
        }
        return false
    }

    // No DEBUG variable set
    if (!DEBUG) return false

    // Check for wildcard
    if (DEBUG === '*') return true

    // Check namespace vs DEBUG env var
    const envVars = createRegexFromEnvVar(DEBUG)
    return envVars.some(regex => regex.test(namespace))
}

/**
 * Map %j to `JSON.stringify()`, since Cloudflare Workers don't
 * have Web Inspectors.
 */
function createFormatters () {
    return {
        j: function (v:any) {
            try {
                return JSON.stringify(v)
            } catch (error) {
                return '[UnexpectedJSONParseError]: ' + String(error)
            }
        }
    }
}

function logger (
    namespace:string,
    args:any[],
    { prevTime, color },
    env?:Record<string, string>
) {
    args = args || []
    if (!isEnabled(namespace, env)) return

    // Set `diff` timestamp
    const curr = Number(new Date())
    const diff = curr - (prevTime || curr)
    prevTime = curr

    args[0] = coerce(args[0])
    const formatters = createFormatters()

    if (typeof args[0] !== 'string') {
        // Anything else let's inspect with %O
        args.unshift('%O')
    }

    // Apply any `formatters` transformations
    let index = 0
    args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
        // If we encounter an escaped %, then don't increase the
        // array index
        if (match === '%%') return '%'

        index++

        const formatter = formatters[format]
        if (typeof formatter === 'function') {
            const val = args[index]
            match = formatter.call(globalThis, val)

            // Now we need to remove `args[index]` since it's inlined
            //   in the `format`
            args.splice(index, 1)
            index--
        }
        return match
    })

    // Apply Cloudflare-specific formatting (no colors in Workers typically)
    const _args = formatArgs({
        diff,
        color,
        useColors: shouldUseColors(),
        namespace
    }, args)

    log(..._args)
}

function shouldUseColors ():boolean {
    // Cloudflare Workers typically don't support colors in console output
    // But we can detect if we're in a development environment
    return false
}

/**
 * Format log arguments for Cloudflare Workers (no color support typically).
 * Mutates the given args.
 */
function formatArgs ({ diff, namespace }:{
    diff:number,
    color:number,
    namespace:string,
    useColors:boolean
}, args:string[]) {
    args[0] = namespace + ' ' + args[0] + ' +' + humanize(diff, {})
    return args
}

function createDebug (namespace?:string, env?:Record<string, string>):Debugger;
function createDebug (enabled:boolean):Debugger;
function createDebug (
    namespaceOrEnabled?:string|boolean,
    env?:Record<string, string>
):Debugger {
    // Handle the case where first parameter is a boolean
    if (typeof namespaceOrEnabled === 'boolean') {
        if (namespaceOrEnabled === false) return noop
        // If namespaceOrEnabled is true, use DEV mode with forced logging
        return createDebug('DEV', { DEBUG: '*' })
    }

    const prevTime = Number(new Date())
    const color = selectColor(
        typeof namespaceOrEnabled === 'string' ?
            namespaceOrEnabled :
            generateRandomString(10),
        colors
    )

    const actualNamespace = typeof namespaceOrEnabled === 'string' ?
        namespaceOrEnabled :
        'DEV'

    // Handle environment parameter
    let envObj:Record<string, string>|undefined
    if (typeof env === 'object') {
        envObj = env
    }

    const debug = function (...args:any[]) {
        return logger(
            actualNamespace,
            args,
            { prevTime, color },
            envObj
        )
    }

    debug.extend = function (extension:string):Debugger {
        const extendedNamespace = actualNamespace + ':' + extension
        return createDebug(extendedNamespace, envObj)
    }

    return debug
}
