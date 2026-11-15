import { getFirst } from "./first-dep.js";

// In the third entry, this name collides with second's renamed `value`.
const second_value = 7;

it("isolates second's top-level `value` from first without an IIFE", () => {
	expect(getFirst()).toBe("first");
	expect(second_value).toBe(7);
	// second declares `value`; renaming keeps it from leaking into this scope
	expect(typeof value).toBe("undefined");
});
