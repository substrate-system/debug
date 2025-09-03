import assert from 'node:assert'
import test, { after, before, describe } from 'node:test'
import { Miniflare } from 'miniflare'

describe('Cloudflare Workers Debug Tests', () => {
    /**
     * @type {Miniflare}
     */
    let worker

    before(async () => {
        worker = new Miniflare({
            modules: [
                {
                    type: 'ESModule',
                    path: 'test/cloudflare-worker-bundled.js'
                }
            ],
            compatibilityDate: '2023-05-18',
            // Test with DEBUG environment variable
            bindings: {
                DEBUG: '*'
            }
        })
        await worker.ready
    })

    after(async () => {
        await worker.dispose()
    })

    test('Worker health check', async () => {
        const response = await worker.dispatchFetch('http://localhost/health')
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'OK')
    })

    test('Basic debug functionality', async () => {
        const response = await worker.dispatchFetch('http://localhost/test-basic')
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'Basic debug test completed')
    })

    test('Debug extend functionality', async () => {
        const response = await worker.dispatchFetch('http://localhost/test-extend')
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'Extend debug test completed')
    })

    test('Forced debug (always logs)', async () => {
        const response = await worker.dispatchFetch('http://localhost/test-forced')
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'Forced debug test completed')
    })

    test('Disabled debug (never logs)', async () => {
        const response = await worker.dispatchFetch('http://localhost/test-disabled')
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'Disabled debug test completed')
    })

    test('Debug formatting', async () => {
        const response = await worker.dispatchFetch(
            'http://localhost/test-formatting'
        )
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'Formatting debug test completed')
    })

    test('DEV mode debug', async () => {
        const response = await worker.dispatchFetch('http://localhost/test-dev-mode')
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'DEV mode test completed')
    })

    test('Chained extend functionality', async () => {
        const response = await worker.dispatchFetch(
            'http://localhost/test-chained-extend'
        )
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(),
            'Chained extend test completed')
    })
})

describe('Cloudflare Workers Debug with Specific Namespace', () => {
    /**
     * @type {Miniflare}
     */
    let worker

    before(async () => {
        worker = new Miniflare({
            modules: [
                {
                    type: 'ESModule',
                    path: 'test/cloudflare-worker-bundled.js'
                }
            ],
            compatibilityDate: '2023-05-18',
            // Test with specific DEBUG namespace
            bindings: {
                DEBUG: 'worker:*'
            }
        })
        await worker.ready
    })

    after(async () => {
        await worker.dispose()
    })

    test('Specific namespace pattern works', async () => {
        const response = await worker.dispatchFetch('http://localhost/test-basic')
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'Basic debug test completed')
    })

    test('Extend with specific namespace works', async () => {
        const response = await worker.dispatchFetch('http://localhost/test-extend')
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'Extend debug test completed')
    })
})

describe('Cloudflare Workers Debug with No DEBUG Environment', () => {
    /**
     * @type {Miniflare}
     */
    let worker

    before(async () => {
        worker = new Miniflare({
            modules: [
                {
                    type: 'ESModule',
                    path: 'test/cloudflare-worker-bundled.js'
                }
            ],
            compatibilityDate: '2023-05-18'
            // No DEBUG environment variable set
        })
        await worker.ready
    })

    after(async () => {
        await worker.dispose()
    })

    test('Works without DEBUG environment', async () => {
        const response = await worker.dispatchFetch('http://localhost/test-basic')
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'Basic debug test completed')
    })

    test('DEV mode still works without DEBUG environment', async () => {
        const response = await worker.dispatchFetch('http://localhost/test-dev-mode')
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'DEV mode test completed')
    })

    test('Forced debug still works without DEBUG environment', async () => {
        const response = await worker.dispatchFetch('http://localhost/test-forced')
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(), 'Forced debug test completed')
    })
})

describe('Cloudflare Workers Debug Bindings Access', () => {
    /**
     * @type {Miniflare}
     */
    let worker

    before(async () => {
        worker = new Miniflare({
            modules: [
                {
                    type: 'ESModule',
                    path: 'test/cloudflare-worker-bundled.js'
                }
            ],
            compatibilityDate: '2023-05-18',
            bindings: {
                DEBUG: 'worker:auth,service:*'
            }
        })
        await worker.ready
    })

    after(async () => {
        await worker.dispose()
    })

    test('Can access bindings from test', async () => {
        const bindings = await worker.getBindings()
        assert.strictEqual(bindings.DEBUG, 'worker:auth,service:*')
    })

    test('Complex DEBUG pattern works', async () => {
        const response = await worker.dispatchFetch(
            'http://localhost/test-chained-extend'
        )
        assert.strictEqual(response.status, 200)
        assert.strictEqual(await response.text(),
            'Chained extend test completed')
    })
})
