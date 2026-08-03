import { value } from "./mid.js";

it("should keep a css module hoisted when wrapping propagates to it", () => {
	// css exports are shared-scope bindings, not an exports object: moving them
	// into the wrapper closure loses their internal names
	expect(typeof value).toBe("string");
	expect(value.length).toBeGreaterThan(0);
});
