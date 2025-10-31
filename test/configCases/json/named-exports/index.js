import { value } from './data.json';

it('should allow to use named export', () => {
  expect(value).toBe(42);
});
