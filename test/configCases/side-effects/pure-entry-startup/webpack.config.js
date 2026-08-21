"use strict";

const common = {
	target: "node",
	mode: "production",
	module: {
		rules: [{ test: /[\\/]pure-cjs\.js$/, sideEffects: false }]
	},
	optimization: {
		// Keeps the entry a module of its own, so the runtime has to start it.
		concatenateModules: false
	}
};

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	{
		...common,
		name: "bootstrap",
		entry: "./lib.js",
		output: {
			filename: "bundle0.mjs",
			library: { type: "module" },
			module: true
		},
		experiments: { outputModule: true }
	},
	{
		...common,
		name: "esm-chunk",
		entry: { bundle1: "./lib.js" },
		output: {
			filename: "[name].mjs",
			library: { type: "module" },
			module: true
		},
		optimization: {
			...common.optimization,
			runtimeChunk: { name: "runtime1" }
		},
		experiments: { outputModule: true }
	},
	{
		...common,
		name: "commonjs-chunk",
		entry: { bundle2: "./lib.js" },
		output: {
			filename: "[name].js",
			library: { type: "commonjs2" }
		},
		optimization: { ...common.optimization, runtimeChunk: { name: "runtime2" } }
	},
	{
		name: "assertions",
		target: "node",
		mode: "production",
		dependencies: ["bootstrap", "esm-chunk", "commonjs-chunk"],
		output: { filename: "bundle3.js" }
	}
];
