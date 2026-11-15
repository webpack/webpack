"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const outputPath = __STATS__.children[__STATS_I__].outputPath;
const source = fs.readFileSync(
	path.join(outputPath, `bundle${__STATS_I__}.mjs`),
	"utf-8"
);
// only the top-level setup, excluding module bodies (which embed this test source)
const header = source.slice(0, source.indexOf("__webpack_modules__"));
// Built dynamically so the asserted phrase never appears verbatim in this file,
// which is itself embedded into the bundle being inspected.
const external = (guard) =>
	`module.exports = ${guard}process.${"getBuiltinModule"}("node:os");`;
const processGuard = 'typeof process !== "undefined" && ';
const getterGuard = 'typeof process.getBuiltinModule === "function" && ';

it("should load node built-in modules in a universal bundle", () => {
	expect(typeof fs.readFileSync).toBe("function");
	expect(typeof path.join).toBe("function");
});

it("should resolve a node-commonjs external at runtime in an ESM bundle", () => {
	// `os` is the universal node-commonjs external; a working result proves the getter runs in real ESM
	expect(typeof os.platform()).toBe("string");
	expect(Array.isArray(os.cpus())).toBe(true);
});

it("should not statically import or set up `createRequire` (would crash in browser)", () => {
	expect(header).not.toMatch(/\bfrom\b/);
	expect(header).not.toContain("createRequire");
});

it("should keep both getter guards on a universal target", () => {
	// even with the getter known, a browser `process` shim may lack it
	expect(source).toContain(external(processGuard + getterGuard));
});
