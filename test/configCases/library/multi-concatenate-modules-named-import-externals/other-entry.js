import { readFile } from 'externals-2/foo'

it('should not optimize external modules in different concatenation scope', () => {
	expect(readFile).toBeDefined()
})