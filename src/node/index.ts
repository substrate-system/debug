import supportsColor from 'supports-color'
import tty from 'node:tty'
import util from 'node:util'
import {
    generateRandomString,
    coerce,
    createRegexFromEnvVar,
    type Debugger
} from '../index.js'
import ms from '../ms.js'

export * from '../index.js'

(function () {
    if (typeof self === 'undefined' && typeof global === 'object') {
        // @ts-expect-error self
        global.self = global
    }
})()

/**
 * Maximally distinct ANSI 256 color codes.
 * Selected for perceptual distance - every pair is visually distinguishable.
 */
const colors:number[] = (supportsColor &&
    // @ts-expect-error ???
    (supportsColor.stderr || supportsColor).level >= 2) ? ([
        196,  // red
        46,   // green
        21,   // blue
        129,  // purple
        208,  // orange
        201,  // magenta
        142,  // olive
        130,  // brown
        30,   // teal
        245,  // grey
    ]) :
    ([1, 2, 3, 4, 5, 6])

/**
 * Is stdout a TTY? Colored output is enabled when `true`.
 */
function shouldUseColors ():boolean {
    return tty.isatty(process.stderr.fd) || !!process.env.FORCE_COLOR
}

function getDate ():string {
    return new Date().toISOString()
}

/**
 * Invokes `util.format()` with the specified arguments and writes to stderr.
 */
function log (...args:any[]):boolean {
    return process.stderr.write(util.format(...args) + '\n')
}

/**
 * Mutate formatters
 * Map %o to `util.inspect()`, all on a single line.
 */
function createFormatters (useColors:boolean, inspectOpts = {}) {
    return {
        o: function (v) {
            return util.inspect(v, Object.assign({}, inspectOpts, {
                colors: useColors
            }))
                .split('\n')
                .map(str => str.trim())
                .join(' ')
        },

        O: function (v) {
            return util.inspect(v, Object.assign({}, inspectOpts, {
                colors: shouldUseColors()
            }))
        }
    }
}

let randomNamespace:string = ''

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {string} namespace
 * @return {Function}
 */
export function createDebug (
    namespace:string|boolean|null,
    env?:Record<string, any>
):Debugger {
    // eslint-disable-next-line
    let prevTime = Number(new Date())
    if (!randomNamespace) randomNamespace = generateRandomString(10)
    const _namespace = typeof namespace === 'string' ? namespace : randomNamespace
    const color = selectColor(
        typeof namespace === 'string' ? namespace : generateRandomString(10),
        colors
    )

    function debug (...args:any[]) {
        if (isEnabled(namespace, env)) {
            if (!namespace) return  // for TS

            return logger(
                namespace === true ? 'DEV' : namespace,
                args,
                { prevTime, color }
            )
        }
    }

    debug.extend = function (extension:string):Debugger {
        const extendedNamespace = _namespace + ':' + extension
        return createDebug(extendedNamespace, env)
    }

    return debug as Debugger
}

createDebug.shouldLog = function (envString:string) {
    return (envString && (envString === 'development' || envString === 'test'))
}

export default createDebug

function logger (namespace:string, args:any[], { prevTime, color }) {
    // Set `diff` timestamp
    const curr = Number(new Date())
    const diff = curr - (prevTime || curr)
    prevTime = curr

    args[0] = coerce(args[0])
    const formatters = createFormatters(shouldUseColors())

    if (typeof args[0] !== 'string') {
        // Anything else let's inspect with %O
        args.unshift('%O')
    }

    // Apply any `formatters` transformations
    let index = 0
    args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
        // If we encounter an escaped % then don't increase the
        // array index
        if (match === '%%') return '%'

        index++

        const formatter = formatters[format]
        if (typeof formatter === 'function') {
            const val = args[index]
            match = formatter.call(self, val)

            // Now we need to remove `args[index]` since it's inlined
            //   in the `format`
            args.splice(index, 1)
            index--
        }
        return match
    })

    // Apply env-specific formatting (colors, etc.)
    const _args = formatArgs({
        diff,
        color,
        useColors: shouldUseColors(),
        namespace
    }, args)

    log(..._args)
}

/**
 * Check if the given namespace is enabled.
 */
function isEnabled (namespace?:string|boolean|null, _env?:Record<string, string>):boolean {
    const env = _env || process.env

    if (namespace === true) {
        return true
    }

    // if no namespace, and we are in dev mode
    if (!namespace) {
        return false
    }

    // there is a namespace
    if (!env.DEBUG) return false  // if no env DEBUG mode

    // else check namespace vs DEBUG env var
    const envVars = createRegexFromEnvVar(env.DEBUG)
    return envVars.some(regex => regex.test(namespace))
}

/**
 * Adds ANSI color escape codes if enabled.
 */
function formatArgs ({ diff, color, namespace, useColors }:{
    diff:number,
    color:number,
    namespace:string,
    useColors:boolean
}, args:string[]):string[] {
    args = args || []

    if (useColors) {
        const c = color
        const colorCode = '\u001B[3' + (c < 8 ? c : '8;5;' + c)
        const prefix = `  ${colorCode};1m${namespace} \u001B[0m`

        args[0] = prefix + args[0].split('\n').join('\n' + prefix)
        args.push(colorCode + 'm+' + ms(diff) + '\u001B[0m')
    } else {
        args[0] = getDate() + ' ' + namespace + ' ' + args[0]
    }

    return args
}

/**
 * Selects a color for a debug namespace
 * @param {string} namespace The namespace string for the debug instance to be colored
 * @param {number[]} colors The namespace string for the debug instance to be colored
 * @return {number} An ANSI color code for the given namespace
 */
function selectColor (namespace:string, colors:number[]):number {
    let hash = 0

    for (let i = 0; i < namespace.length; i++) {
        hash = ((hash << 5) - hash) + namespace.charCodeAt(i)
        hash |= 0  // Convert to 32bit integer
    }

    return colors[Math.abs(hash) % colors.length]
}
