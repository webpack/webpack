it("should pass package.json type to loader", function (done) {
	expect(require("cjs/loader.js!")).toBe("commonjs");
	expect(require("esm/loader.js!")).toBe("module");
	expect(require("./loader.js!")).toBe("undefined");
});

it("should pass 'commonjs' type to loader for .cjs", function () {
	expect(require("cjs/loader.cjs!")).toBe("commonjs");
	expect(require("esm/loader.cjs!")).toBe("commonjs");
	expect(require("./loader.cjs!")).toBe("commonjs");
});

it("should pass 'module' type to loader for .mjs", function () {
	expect(require("cjs/loader.mjs!")).toBe("module");
	expect(require("esm/loader.mjs!")).toBe("module");
	expect(require("./loader.mjs!")).toBe("module");
});
