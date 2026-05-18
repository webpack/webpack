"use strict";

const Module = require("module");
const path = require("path");

// Pre-load each .mjs fixture through Node's real `require(esm)`. `Module._load`
// is the low-level loader that backs `require()` and is **not** intercepted by
// Jest (unlike `Module.createRequire`, which Jest replaces with its own
// runtime), so this gives us the value Node natively returns for `require()`
// of an ES module with a `"module.exports"` named export.
//
// `testConfig.modules` lets the test harness short-circuit `require()` calls
// for these absolute paths and return the pre-loaded value directly — which is
// what makes `require(/* webpackIgnore: true */ valueMjsPath)` resolve to the
// real native value at runtime, despite the harness's own require shim
// otherwise refusing to evaluate `.mjs` synchronously as CJS.
const valuePath = path.resolve(__dirname, "value.mjs");
const plainPath = path.resolve(__dirname, "plain.mjs");
const noSpecialPath = path.resolve(__dirname, "no-special-export.mjs");
const withDefaultPath = path.resolve(__dirname, "with-default.mjs");
const reexportPath = path.resolve(__dirname, "reexport.mjs");

module.exports = {
	modules: {
		[valuePath]: Module._load(valuePath, null, false),
		[plainPath]: Module._load(plainPath, null, false),
		[noSpecialPath]: Module._load(noSpecialPath, null, false),
		[withDefaultPath]: Module._load(withDefaultPath, null, false),
		[reexportPath]: Module._load(reexportPath, null, false)
	}
};
