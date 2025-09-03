// Simple Cloudflare Worker that uses the debug library
// This will be used for testing in Miniflare
import createDebug from '../dist/cloudflare/index.js'

const debug = createDebug('worker:main')
const debugAuth = debug.extend('auth')
const debugAPI = debug.extend('api')

export default {
    async fetch (request) {
        const url = new URL(request.url)
        debug('Handling request to %s', url.pathname)

        // Test different debug scenarios based on the path
        switch (url.pathname) {
            case '/test-basic':
                debug('Basic debug test')
                return new Response('Basic debug test completed', {
                    status: 200
                })

            case '/test-extend':
                debugAuth('Authentication check')
                debugAPI('API call processing')
                return new Response('Extend debug test completed', {
                    status: 200
                })

            case '/test-forced': {
                // Test forced debug (should always log)
                const forcedDebug = createDebug(true)
                forcedDebug('This should always log')
                return new Response('Forced debug test completed', { status: 200 })
            }

            case '/test-disabled': {
                // Test disabled debug
                const disabledDebug = createDebug(false)
                disabledDebug('This should never log')
                return new Response('Disabled debug test completed', {
                    status: 200
                })
            }

            case '/test-formatting': {
                debug('String: %s, Number: %d, JSON: %j', 'cloudflare', 42, {
                    worker: true
                })
                return new Response('Formatting debug test completed', {
                    status: 200
                })
            }

            case '/test-dev-mode': {
                // Test DEV mode (no namespace)
                const devDebug = createDebug()
                devDebug('DEV mode message')
                return new Response('DEV mode test completed', { status: 200 })
            }

            case '/test-chained-extend': {
                const baseDebug = createDebug('service')
                const extendedDebug = baseDebug.extend('handler')
                const chainedDebug = extendedDebug.extend('auth')

                baseDebug('Base service message')
                extendedDebug('Handler message')
                chainedDebug('Chained auth message')

                return new Response('Chained extend test completed', {
                    status: 200
                })
            }

            case '/test-env-object': {
                // Test with environment object
                const envDebug = createDebug('test:env', { DEBUG: 'test:*' })
                const envDebug2 = createDebug('other:env', { DEBUG: 'test:*' })
                envDebug('This should log with env object')
                envDebug2('This should not log with env object')
                return new Response('Environment object test completed', {
                    status: 200
                })
            }

            case '/test-env-boolean-true': {
                // Test with boolean true as env parameter
                const trueBoolDebug = createDebug('some:namespace', true)
                trueBoolDebug('This should always log with boolean true env')
                return new Response('Boolean true env test completed', {
                    status: 200
                })
            }

            case '/test-env-boolean-false': {
                // Test with boolean false as env parameter
                const falseBoolDebug = createDebug('some:namespace', false)
                falseBoolDebug('This should never log with boolean false env')
                return new Response('Boolean false env test completed', {
                    status: 200
                })
            }

            case '/health':
                return new Response('OK', { status: 200 })

            default:
                return new Response('Not found', { status: 404 })
        }
    }
}
