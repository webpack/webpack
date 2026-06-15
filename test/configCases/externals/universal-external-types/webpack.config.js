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
	// Unsupported in a universal ESM target (would throw in node or the browser):
	//   this (top-level `this` is undefined in ESM), window/self (browser-only globals),
	//   amd/amd-require/umd/umd2/jsonp/system (need a matching `output.libraryTarget`),
	//   script (DOM-only), asset/asset-url/css-import/css-url (non-JS module types).
	output: { module: true },
	experiments: { outputModule: true }
};
