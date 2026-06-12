import { getSecond } from "./second-dep.js";

var value = 42;
const shorthand = { value };

// `value` collides with first's global read, so it is renamed; the object
// shorthand must be rewritten to `{ value: <renamed> }`.
it("renames second's `value`, including the object shorthand, without an IIFE", () => {
	expect(shorthand.value).toBe(42);
	expect(getSecond()).toBe("second");
});
