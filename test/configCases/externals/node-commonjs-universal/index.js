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
	expect(header).toContain("getBuiltinModule");
});

it("should guard getBuiltinModule with optional chaining when supported", () => {
	if (__STATS_I__ === 0) {
		// optional chaining supported
		expect(header).toContain("process.getBuiltinModule?.");
	} else {
		// `&&` short-circuit fallback
		expect(header).toContain(
			"process.getBuiltinModule && process.getBuiltinModule"
		);
	}
});
