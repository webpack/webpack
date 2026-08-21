import { readLazy } from "./lib.js";

it("should evaluate the deferred module on access", () => {
	expect(readLazy(6, 7)).toBe(43);
});
