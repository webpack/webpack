import { getFirst } from "./first-dep.js";

it("isolates second's top-level `value` from first without an IIFE", () => {
	expect(getFirst()).toBe("first");
	// second declares `value`; renaming keeps it from leaking into this scope
	expect(typeof value).toBe("undefined");
});
