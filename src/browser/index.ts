import humanize from 'ms'
import {
    generateRandomString,
    coerce,
    selectColor,
    createRegexFromEnvVar
} from '../common.js'
import { colors } from './util.js'

const log = console.log || (() => {})

interface CreateDebugger {
    (env?:string):(...args:any[])=>void;
}

let randomNamespace:string = ''
let createDebug:CreateDebugger = (_?:string) => (..._args:any[]) => {}

if (
    import.meta?.env?.DEV ||
    import.meta?.env?.VITE_DEBUG ||
    !import.meta?.env?.PROD
) {
    /**
     * @param {string} [namespace]
     * @return {(...args:any[])=>void}
     */
    createDebug = function createDebug (namespace?:string) {
        const prevTime = Number(new Date())
        if (!randomNamespace) {
            randomNamespace = generateRandomString(10)
        }
        const color = selectColor(namespace || randomNamespace, colors)

        const debug:(...args:any[])=>void = function (...args:any[]) {
            return logger(namespace || 'DEV', args, { prevTime, color })
        }

        return debug
    }
}

export { createDebug }
export default createDebug

/**
 * Check if the given namespace is enabled.
 * `namespace` is the name that is passed into debug.
 * Need to check it against the env var.
 */
function isEnabled (namespace:string):boolean {
    if (import.meta.env.VITE_DEBUG === '*') return true

    if (namespace === 'DEV') {  // if we were not called with a namespace
        if (!import.meta.env.VITE_DEBUG) {  // if no debug env var
            // then log if DEV mode is true
            return import.meta.env.DEV
        }
    }

    // else, we were called with a namespace
    // check the namespace
    if (!import.meta.env.VITE_DEBUG) {
        // called with a namespace, but no env var
        return import.meta.env.DEV
    }

    const envVars = createRegexFromEnvVar(namespace)
    return envVars.some(regex => regex.test(import.meta.env.VITE_DEBUG))
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
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

function logger (namespace:string, args:any[], { prevTime, color }) {
    if (!isEnabled(namespace)) return

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

function shouldUseColors ():boolean {
    // Internet Explorer and Edge do not support colors.
    if (typeof navigator !== 'undefined' && navigator.userAgent &&
        navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false
    }

    // Is webkit? http://stackoverflow.com/a/16459606/376773
    // document is undefined in react-native:
    //   https://github.com/facebook/react-native/pull/1632
    return !!((typeof document !== 'undefined' && document.documentElement &&
        document.documentElement.style &&
        document.documentElement.style.webkitAppearance) ||
        // Is firefox >= v31?
        // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
        (typeof navigator !== 'undefined' &&
            navigator.userAgent &&
            navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) &&
            parseInt(RegExp.$1, 10) >= 31) ||
        // Double check webkit in userAgent just in case we are in a worker
        (typeof navigator !== 'undefined' &&
            navigator.userAgent &&
            navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)))
}

/**
 * Colorize log arguments if enabled.
 */
function formatArgs ({ diff, color, namespace, useColors }:{
    diff:number,
    color:number,
    namespace:string,
    useColors:boolean
}, args) {
    args[0] = (useColors ? '%c' : '') +
        namespace +
        (useColors ? ' %c' : ' ') +
        args[0] +
        (useColors ? '%c ' : ' ') +
        '+' + humanize(diff)

    if (!useColors) return

    const c = 'color: ' + color
    args.splice(1, 0, c, 'color: inherit')

    // The final "%c" is somewhat tricky, because there could be other
    // arguments passed either before or after the %c, so we need to
    // figure out the correct index to insert the CSS into
    let index = 0
    let lastC = 0
    args[0].replace(/%[a-zA-Z%]/g, match => {
        if (match === '%%') {
            return
        }
        index++
        if (match === '%c') {
            // We only are interested in the *last* %c
            // (the user may have provided their own)
            lastC = index
        }
    })

    args.splice(lastC, 0, c)

    return args
}
