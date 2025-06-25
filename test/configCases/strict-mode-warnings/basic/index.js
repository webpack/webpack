// Test that warnings are generated for modules converted to strict mode
import { esmValue } from "./esm-module";
import { esmStrictValue } from "./esm-with-strict";

it("should import ESM modules", () => {
	expect(esmValue).toBe(42);
	expect(esmStrictValue).toBe(42);
});

it("should generate warning in stats", () => {
	const stats = __STATS__;
	expect(stats.warnings).toBeDefined();
	expect(stats.warnings.length).toBeGreaterThan(0);
	
	// Check that warning was generated for esm-module.js
	const warnings = stats.warnings;
	const strictModeWarning = warnings.find(w => 
		w.message && w.message.includes("was automatically converted to strict mode") &&
		w.message.includes("esm-module.js")
	);
	
	expect(strictModeWarning).toBeDefined();
	expect(strictModeWarning.message).toContain("esm-module.js");
	expect(strictModeWarning.message).toContain("was automatically converted to strict mode");
	
	// Check that NO warning was generated for esm-with-strict.js
	const strictModuleWarning = warnings.find(w => 
		w.message && w.message.includes("was automatically converted to strict mode") &&
		w.message.includes("esm-with-strict.js")
	);
	
	expect(strictModuleWarning).toBeUndefined();
});