import mod1 from "./module.mts";
import mod2 from "./module.cts";

import mod3 from "./packages/mts/module.js";
import mod4 from "./packages/cts/module.js";

it("should work", () => {
	expect(mod1).toBe("mts");
	expect(mod2).toBe("cts");
	expect(mod3).toBe("mts");
	expect(mod4).toBe("cts");

	// There are three modules:
	// - index.js + module.ts + packages/mts/module.js (concatenated)
	// - module.cts
	// - packages/cts/module.js
	expect(Object.keys(__webpack_modules__).length).toBe(3);
});
