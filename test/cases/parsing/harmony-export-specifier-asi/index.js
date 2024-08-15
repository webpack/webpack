import { fn } from './a.js';

const num = 1

export { num };

fn(num);

it("should work", function() {
	expect(fn(num)).toBe(1);
});
