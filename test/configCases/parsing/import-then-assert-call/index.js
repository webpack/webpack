import assert, { calls } from "./assert.js"
assert(1)

it("should read an `assert` call after an import with no semicolon as a statement", () => {
	expect(calls).toBe(1);
});
