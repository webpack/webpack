"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		// A `[fullhash]` publicPath with a static prefix is unknown at code generation;
		// the full hash is baked via post-hash placeholder substitution.
		publicPath: "https://cdn.example.com/[fullhash]/",
		chunkFilename: "[name].mjs"
	}
};
