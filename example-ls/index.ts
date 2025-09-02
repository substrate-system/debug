import Debug from '../src/browser/index.js'
const debug = Debug('abc:def')

// localStorage is set in index.html
const debug2 = Debug('abc:123')

const debug3 = Debug('abc:456')

debug('hello world')

debug2('hello two...')

debug3('456...')

localStorage.setItem('DEBUG', 'abc:*')

debug3('456 after setting localStorage...')

localStorage.setItem('DEBUG', '')
