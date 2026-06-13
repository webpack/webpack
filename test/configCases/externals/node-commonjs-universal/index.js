"use strict";

const fs = require("fs");
const path = require("path");

const outputPath = __STATS__.children[__STATS_I__].outputPath;
const source = fs.readFileSync(
	path.join(outputPath, `bundle${__STATS_I__}.mjs`),
	"utf-8"
);
// only the createRequire setup, excluding module bodies (which embed this test source)
const header = source.slice(0, source.indexOf("__webpack_modules__"));

it("should load node built-in modules in a universal bundle", () => {
	expect(typeof fs.readFileSync).toBe("function");
	expect(typeof path.join).toBe("function");
});

it("should not statically import the `module` built-in (would crash in browser)", () => {
	expect(header).not.toMatch(/\bfrom\b/);
	expect(header).toContain("process.getBuiltinModule");
});

it("should pick the loading strategy based on the known node version", () => {
	if (__STATS_I__ === 0) {
		// known node version supporting process.getBuiltinModule: inline guard, no try/catch
		expect(header).toContain('typeof process !== "undefined"');
		expect(header).not.toContain("try {");
	} else {
		// unknown node version: defensive try/catch so the bundle still loads elsewhere
		expect(header).toContain("try {");
	}
});
