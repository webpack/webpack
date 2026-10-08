import { fn } from './a.js';

const num = 1

export { num };

fn(num);

it("harmony-export-specifier-asi: should work", function() {
	expect(fn(num)).toBe(1);
});
