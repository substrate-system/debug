// Simple test to check console capture
const capturedLogs = []
const originalConsoleLog = console.log
console.log = (...args) => {
    capturedLogs.push(args)
    originalConsoleLog('[CAPTURED]', ...args)
}

// Test normal console.log
console.log('test message 1')

// Test with module
// eslint-disable-next-line import/first
import createDebug from '../dist/browser/index.js'

// Mock localStorage
Object.defineProperty(globalThis, 'localStorage', {
    value: {
        getItem: () => 'test',
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
    },
    writable: true,
    configurable: true
})

const debug = createDebug('test')
debug('test message 2')

console.log('Captured logs:', capturedLogs)
