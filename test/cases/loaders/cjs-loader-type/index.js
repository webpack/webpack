it("should pass package.json type to loader", function () {
	expect(require("cjs/loader.js!")).toBe("commonjs");
	expect(require("./loader.js!")).toBe("undefined");
});

it("should pass 'commonjs' type to loader for .cjs", function () {
	expect(require("cjs/loader.cjs!")).toBe("commonjs");
	expect(require("./loader.cjs!")).toBe("commonjs");
	// TODO need fix in v8 https://github.com/nodejs/node/issues/35889
	// TODO otherwise this test case cause segment fault
	// expect(require("esm/loader.cjs!")).toBe("commonjs");
});
