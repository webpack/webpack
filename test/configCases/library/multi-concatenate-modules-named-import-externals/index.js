import { readFile } from 'externals-1/foo'
import './cjs'

it('should not optimize external modules in different concatenation scope', () => {
	expect(readFile).toBeDefined()
})