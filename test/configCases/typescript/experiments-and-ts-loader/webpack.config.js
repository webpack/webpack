"use strict";

// Verifies that experiments.typescript and ts-loader can coexist. ts-loader
// transpiles TS → JS; the JavaScript parser then reads that JS with its
// `typescript` option on, which skips nothing there. The combined pipeline
// must still produce a working bundle.

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.ts",
	experiments: {
		typescript: true
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			}
		]
	}
};
