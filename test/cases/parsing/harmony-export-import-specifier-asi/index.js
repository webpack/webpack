import { fn } from './a.js';

const num = 1

export { fn } from './a.js';

fn(num);

it("should work", function() {
	expect(fn(num)).toBe(1);
});
