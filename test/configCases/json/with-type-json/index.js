import { value } from './data.json' with { type: 'json' }

it('should not import named json using import attributes', () => {
  expect(value).toBe(undefined);
});
