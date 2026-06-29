import { getDeferred } from "./provider.js";
import {
	assertTouched,
	assertUntouched
} from "./side-effect-counter.js";

it("should keep lazy evaluation for an escaping deferred namespace", () => {
	assertUntouched();
	// Returning the deferred namespace from a function must not evaluate it...
	const ns = getDeferred();
	assertUntouched();
	// ...the first member access does.
	expect(ns.ENUM_A).toBe("a-value");
	assertTouched();
	expect(ns.ENUM_B).toBe("b-value");
	expect(ns.default).toBe("default-value");
});
