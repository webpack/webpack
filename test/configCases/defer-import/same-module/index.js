import * as mod1 from "./module.js";
import defer * as mod2 from "./module.js";

it("should generate different runtime code for the same module", () => {
	expect(mod1.default).toBe(mod2.default);
	// Per the TC39 import-defer spec, the deferred namespace is a
	// distinct Deferred Module Namespace Exotic Object, separate from
	// the eager namespace of the same module.
	expect(mod1).not.toBe(mod2);
	// Test itself + module
	expect(Object.keys(__webpack_modules__).length).toBe(2);
});
