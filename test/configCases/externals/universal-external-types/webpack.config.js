"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "web"],
	// every external type that produces runnable output in a universal ESM build
	externals: {
		nodeCommonjs: "node-commonjs fs",
		commonjs: "commonjs2 fs",
		varExpr: "var 1 + 2",
		assignExpr: "assign globalThis",
		globalRef: "global globalThis",
		staticModule: "module fs",
		promiseExt: "promise Promise.resolve(42)",
		dynamicImport: "import os"
	},
	// Unsupported in a universal ESM target: `this`, browser-only `window` / `self`,
	// the types needing a matching `output.libraryTarget`, DOM-only `script`, and the
	// non-JS module types.
	output: { module: true }
};
