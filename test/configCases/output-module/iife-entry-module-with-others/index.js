import { value as value1 } from './module1'
const value2 = require('./module2')
const value3 = require('./module3')
const value4 = require('./module4')

let value = 42
let src_value = 43
let src_src_value = 44
let Symbol = 'Symbol'

it('inlined module should not leak to non-inlined modules', () => {
	// The two variables are in nested scope and could be the candidate names for inline module during renaming.
	// The renaming logic should detect them and bypass to avoid the collisions.
	const index_src_value = -1
	const index_src_value_0 = -1

  expect(value1).toBe(undefined)
  expect(value).toBe(42)
  expect(src_value).toBe(43)
  expect(src_src_value).toBe(44)
  expect(Symbol).toBe('Symbol')
  expect(value2).toBe("undefined") // Should not touch `value` variable in inline module.
  expect(value3).toBe("undefined") // Should not touch src_value` in inline module.
	expect(value4).toBe("function") // Module variables in inline module should not shadowling global variables.
})
