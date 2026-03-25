import mod1 from "./module.mts";
import mod2 from "./module.cts";

it("should work", () => {
	expect(mod1).toBe("mts");
	expect(mod2).toBe("cts");

	// There are two modules:
	// - index.js + module.ts (concatenated)
	// - module.cts
	expect(Object.keys(__webpack_modules__).length).toBe(2);
});
