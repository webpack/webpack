"use strict";

// Verifies that experiments.typescript and ts-loader can coexist. ts-loader
// transpiles TS → JS; the built-in TypeScriptPlugin then sees JS at
// processResult time and `stripTypeScriptTypes` is effectively a no-op on
// the already-stripped output. The combined pipeline must still produce a
// working bundle.

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
