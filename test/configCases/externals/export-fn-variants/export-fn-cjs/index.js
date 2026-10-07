it("export-fn-cjs: Should work with export a function", function(done) {
	const myModule = require("module");
	expect(typeof myModule).toBe("function");
	expect(myModule.builtinModules).toBeDefined();
	done()
});

it("export-fn-cjs: should work with export a object", function(done) {
	const myFs = require("fs");
	expect(typeof myFs).toBe("object");
	expect(myFs.readFileSync).toBeDefined();
	done()
});