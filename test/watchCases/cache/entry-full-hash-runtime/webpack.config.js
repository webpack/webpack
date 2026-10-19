"use strict";

const { DefinePlugin } = require("../../../../");

// The runtime of `main` bakes the compilation hash into its public path, so
// changing `other` renames that runtime chunk while `main` itself stays put.
/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ module: true, realContentHash: true },
	{ module: true, realContentHash: false },
	{ module: false, realContentHash: true },
	{ module: false, realContentHash: false }
].map(({ module, realContentHash }, index) => ({
	name: `compiler-${index}`,
	mode: "production",
	target: "node",
	cache: { type: "filesystem" },
	entry: {
		bundle: {
			import: "./index.js",
			filename: `bundle${index}.${module ? "mjs" : "js"}`
		},
		main: "./entry.js",
		other: "./other.js"
	},
	output: {
		module,
		chunkFormat: module ? "module" : "commonjs",
		filename: `[name]-${index}.[contenthash].${module ? "mjs" : "js"}`,
		publicPath: "/[fullhash]/",
		clean: false
	},
	plugins: [new DefinePlugin({ NAME: JSON.stringify(`compiler-${index}`) })],
	optimization: {
		minimize: false,
		realContentHash,
		runtimeChunk: "multiple"
	}
}));
