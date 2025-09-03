import humanize from 'ms'
import {
    generateRandomString,
    coerce,
    selectColor,
    createRegexFromEnvVar
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
 * `forcedEnabled` is a boolean that forces logging when true.
 */
function isEnabled (namespace: string, forcedEnabled?: boolean): boolean {
    // If explicitly forced to be enabled via boolean true
    if (forcedEnabled === true) return true

    // In Cloudflare Workers, check global DEBUG variable or environment
    const DEBUG = (typeof globalThis !== 'undefined' && (globalThis as any).DEBUG) ||
                  (typeof process !== 'undefined' && process.env?.DEBUG)

    // Check for wildcard
    if (DEBUG === '*') return true

    // if we were not called with a namespace
    if (namespace === 'DEV') {
        // We want to log iff there is no DEBUG variable.
        if (!DEBUG) {
            return true
        }
        return false
    }

    // No DEBUG variable set
    if (!DEBUG) return false

    const envVars = createRegexFromEnvVar(DEBUG)
    return envVars.some(regex => regex.test(namespace))
}

/**
 * Map %j to `JSON.stringify()`, since Cloudflare Workers don't have Web Inspectors.
 */
function createFormatters () {
    return {
        j: function (v: any) {
            try {
                return JSON.stringify(v)
            } catch (error) {
                return '[UnexpectedJSONParseError]: ' + String(error)
            }
        }
    }
}

function logger (
    namespace: string,
    args: any[],
    { prevTime, color },
    forcedEnabled?: boolean
) {
    args = args || []
    if (!isEnabled(namespace, forcedEnabled)) return

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

function shouldUseColors (): boolean {
    // Cloudflare Workers typically don't support colors in console output
    // But we can detect if we're in a development environment
    return false
}

/**
 * Format log arguments for Cloudflare Workers (no color support typically).
 */
function formatArgs ({ diff, namespace }: {
    diff: number,
    color: number,
    namespace: string,
    useColors: boolean
}, args) {
    args[0] = namespace + ' ' + args[0] + ' +' + humanize(diff, {})
    return args
}

export type CloudflareDebugger = {
    (...args: any[]): void;
    extend: (namespace: string) => CloudflareDebugger;
}

function createDebug (namespace?: string | boolean): CloudflareDebugger {
    if (namespace === false) return noop
    const prevTime = Number(new Date())
    const color = selectColor(
        typeof namespace === 'string' ? namespace : generateRandomString(10),
        colors
    )

    // Determine if this is a boolean true passed as the namespace
    const forcedEnabled = namespace === true
    const actualNamespace = typeof namespace === 'string' ? namespace : 'DEV'

    const debug = function (...args: any[]) {
        return logger(
            actualNamespace,
            args,
            { prevTime, color },
            forcedEnabled
        )
    }

    debug.extend = function (extension: string): CloudflareDebugger {
        const extendedNamespace = actualNamespace + ':' + extension
        return createDebug(extendedNamespace)
    }

    return debug as CloudflareDebugger
}
