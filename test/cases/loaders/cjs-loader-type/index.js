it("should pass package.json type to loader", function () {
	expect(require("cjs/loader.js!")).toBe("commonjs");
	expect(require("./loader.js!")).toBe("undefined");
});

it("should pass 'commonjs' type to loader for .cjs", function () {
	expect(require("cjs/loader.cjs!")).toBe("commonjs");
	expect(require("./loader.cjs!")).toBe("commonjs");
	expect(require("esm/loader.cjs!")).toBe("commonjs");
});
