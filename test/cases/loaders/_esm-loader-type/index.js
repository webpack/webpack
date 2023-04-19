it("should pass package.json type to loader", function () {
	expect(require("esm/loader.js!")).toBe("module");
});

it("should pass 'module' type to loader for .mjs", function () {
	expect(require("cjs/loader.mjs!")).toBe("module");
	expect(require("esm/loader.mjs!")).toBe("module");
	expect(require("./loader.mjs!")).toBe("module");
});
