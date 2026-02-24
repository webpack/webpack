import * as ns from './lib'

it('should have correct reexport', () => {
  expect(ns).toHaveProperty('readFile');
  expect(ns).toHaveProperty('resolve');


  expect(typeof ns.sep).toBe('string');
})
