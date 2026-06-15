"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "web"],
	// every external type that produces runnable output in a universal ESM build
	externals: {
		nodeCommonjs: "node-commonjs fs",
		varExpr: "var 1 + 2",
		assignExpr: "assign globalThis",
		staticModule: "module fs",
		promiseExt: "promise Promise.resolve(42)",
		dynamicImport: "import os"
	},
	// Unsupported in a universal ESM target (would throw in node or the browser):
	//   commonjs/commonjs2/commonjs-module/commonjs-static (no `require` in ESM),
	//   amd/amd-require/umd/umd2/jsonp/system (need a matching `output.libraryTarget`),
	//   script (DOM-only), this/window/self/global (env- or globalObject-specific),
	//   asset/asset-url/css-import/css-url (non-JS module types).
	output: { module: true },
	experiments: { outputModule: true }
};
