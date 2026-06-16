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
	// `os` is the universal node-commonjs external; a working result proves the getter runs in real ESM
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
		expect(header).not.toContain('typeof process.getBuiltinModule === "function"');
	} else {
		// unknown/old node -> `typeof`-guarded getter (no `require`; falsy on node <22.3)
		expect(header).toContain('typeof process.getBuiltinModule === "function"');
		expect(header).toContain("createRequire(import.meta.url)");
		expect(header).not.toContain("catch");
	}
});
