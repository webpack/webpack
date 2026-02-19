import * as mod1 from "./module.js";
import defer * as mod2 from "./module.js";

it("should generate different runtime code for the same module", () => {
	expect(mod1.default).toBe(mod2.default);
	expect(mod1).toBe(mod2);
	// Test itself + module
	expect(Object.keys(__webpack_modules__).length).toBe(2);
});
