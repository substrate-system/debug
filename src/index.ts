/**
* Coerce `val`.
*
* @param {unknown} val
* @return {string}
*/
export function coerce (val:unknown):string {
    if (val instanceof Error) {
        return val.stack || val.message
    }

    return String(val)
}

/**
 * Selects a color for a debug namespace
 * @param {string} namespace The namespace string for the debug instance to be colored
 * @return {number|string} An ANSI color code for the given namespace
 */
export function selectColor (
    namespace:string,
    colors:string[]|number[]
):number|string {
    let hash = 0

    for (let i = 0; i < namespace.length; i++) {
        hash = ((hash << 5) - hash) + namespace.charCodeAt(i)
        hash |= 0  // Convert to 32bit integer
    }

    return colors[Math.abs(hash) % colors.length]
}

export function createRegexFromEnvVar (names:string):RegExp[] {
    const split = names.split(/[\s,]+/).filter(Boolean)
    const regexs = split
        .map(word => word.replace(/\*/g, '.*?'))
        .map(r => new RegExp('^' + r + '$'))

    return regexs
}

export type Debugger = {
    (...args: any[]): void;
    extend: (namespace: string) => Debugger;
}

/**
 * Use this to create a random namespace in the case that `debug`
 * is called without any arguments.
 * @param {number} length Lenght of the random string
 * @returns {string}
 */
export function generateRandomString (length = 6):string {
    return Math.random().toString(20).substring(2, length)
}
