var value = 42;
const shorthand = { value };

// `value` collides with index1's global read, so it is renamed; the object
// shorthand must be rewritten to `{ value: <renamed> }`.
it("renames index2's `value`, including the object shorthand, without an IIFE", () => {
	expect(shorthand.value).toBe(42);
});
