"use strict";

const path = require("path");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	target: "node14",
	output: { filename: "bundle.mjs", module: true },
	experiments: { outputModule: true },
	resolve: {
		alias: {
			library: path.resolve(testPath, "../module-live-bindings-0-create/lib.js")
		}
	},
	externalsType: "module",
	// The runtime-chunk library is two linked ESM files, so consume it as a real
	// external module instead of re-bundling it.
	externals: {
		"library-runtime-chunk":
			"../module-live-bindings-0-create/runtime-chunk/main.mjs"
	}
});
