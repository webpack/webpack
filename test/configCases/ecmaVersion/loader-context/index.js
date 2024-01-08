import mod from "./loader.js!./module";

it("should compile and export target and environment", function() {
	expect(mod.target).toBe("node");
	expect(mod.environment.globalThis).toBe(false);
	expect(mod.environment.optionalChaining).toBe(true);
	expect(mod.environment.templateLiteral).toBe(true);
	expect(mod.environment.dynamicImportInWorker).toBe(true);
});
