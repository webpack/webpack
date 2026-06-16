"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

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

it("should resolve a node-commonjs external at runtime in an ESM bundle", () => {
	// the bundle is `.mjs` (ESM); `os` is the universal node-commonjs external,
	// resolved through the generated getter (createRequire/getBuiltinModule), so a
	// working result proves the getter runs in a real ECMAScript module
	expect(typeof os.platform()).toBe("string");
	expect(Array.isArray(os.cpus())).toBe(true);
});

it("should not statically import the `module` built-in (would crash in browser)", () => {
	expect(header).not.toMatch(/\bfrom\b/);
	expect(header).toContain("getBuiltinModule");
});

it("should resolve the builtin getter based on node support", () => {
	if (__STATS_I__ === 0) {
		// node version known to expose `process.getBuiltinModule()` -> call it directly
		expect(header).toContain("process.getBuiltinModule(");
		expect(header).not.toContain("require(");
		expect(header).not.toContain("catch");
	} else {
		// unknown/old node -> probe the getter, else fall back to `createRequire` in a
		// try/catch that swallows the ESM/browser ReferenceError `require` throws
		expect(header).toContain('typeof process.getBuiltinModule === "function"');
		expect(header).toContain("catch");
		expect(header).toContain("require(");
		expect(header).toContain("createRequire(import.meta.url)");
	}
});
