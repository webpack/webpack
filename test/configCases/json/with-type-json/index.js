import def, { value } from './data.json' with { type: 'json' }

it('should not import named json using import attributes', () => {
  expect(def.value).toBe(42);
  expect(value).toBe(undefined);
});
