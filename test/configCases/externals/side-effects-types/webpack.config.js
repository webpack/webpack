"use strict";

/**
 * @param {import("../../../../declarations/WebpackOptions").ExternalItemValueTarget} external the target of the external
 * @returns {import("../../../../declarations/WebpackOptions").ExternalItemValueWithOptions} a side-effect-free external
 */
const free = (external) => ({ external, sideEffects: false });

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "es2020"],
	output: {
		libraryTarget: "commonjs-module",
		importFunctionName: "((name) => Promise.resolve(RECORD(name)))"
	},
	optimization: {
		minimize: false
	},
	// every external type that renders without a matching `output.libraryTarget`,
	// each once side-effect-free and once left to the default
	externals: {
		"var-free": free("var RECORD('var-free')"),
		"var-keep": "var RECORD('var-keep')",
		"assign-free": free("assign globalThis['assign-free']"),
		"assign-keep": "assign globalThis['assign-keep']",
		"this-free": free("this this-free"),
		"this-keep": "this this-keep",
		"global-free": free("global global-free"),
		"global-keep": "global global-keep",
		"commonjs-free": free("commonjs commonjs-free"),
		"commonjs-keep": "commonjs commonjs-keep",
		"commonjs2-free": free("commonjs2 commonjs2-free"),
		"commonjs2-keep": "commonjs2 commonjs2-keep",
		"commonjs-module-free": free("commonjs-module commonjs-module-free"),
		"commonjs-module-keep": "commonjs-module commonjs-module-keep",
		"commonjs-static-free": free("commonjs-static commonjs-static-free"),
		"commonjs-static-keep": "commonjs-static commonjs-static-keep",
		"node-commonjs-free": free("node-commonjs node-commonjs-free"),
		"node-commonjs-keep": "node-commonjs node-commonjs-keep",
		"promise-free": free("promise Promise.resolve(RECORD('promise-free'))"),
		"promise-keep": "promise Promise.resolve(RECORD('promise-keep'))",
		"import-free": free("import import-free"),
		"import-keep": "import import-keep",
		"module-import-free": free("module-import module-import-free"),
		"module-import-keep": "module-import module-import-keep",
		// a dynamic import must keep the external, it has to resolve to it
		"dynamic-free": free("commonjs dynamic-free")
	}
};
