it("should fall back to WebAssembly.instantiate when the wasm MIME type is wrong", function () {
	const warnings = [];
	const oldWarn = console.warn;
	console.warn = (...args) => warnings.push(args);
	return import("./module")
		.then((module) => {
			expect(module.run()).toEqual(84);
			// streaming failed on the wrong MIME type, so the fallback warned
			expect(warnings.length).toBeGreaterThan(0);
			expect(warnings[0][0]).toContain("application/wasm");
		})
		.finally(() => {
			console.warn = oldWarn;
		});
});
