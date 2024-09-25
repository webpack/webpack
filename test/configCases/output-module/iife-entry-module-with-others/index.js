import { value as value1 } from './module1'
const value2 = require('./module2')
const value3 = require('./module3')

let value = 42
let src_value = 43
let src_src_value = 44

it('inlined module should not leak to non-inlined modules', () => {
  expect(value1).toBe(undefined)
  expect(value).toBe(42)
  expect(src_value).toBe(43)
  expect(src_src_value).toBe(44)
  expect(value2).toBe("undefined") // should not touch leaked `value` variable
  expect(value3).toBe("undefined") // should not touch leaked `src_value` variable
})
