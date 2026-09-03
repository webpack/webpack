"use strict";

// `experiments.typescript` stays at its "auto" default and the ts-loader rule is
// path-scoped with its extensions in an alternation — the sample path the
// detection probes with doesn't match it, so only reading the extension out of
// the alternation keeps the built-in support off. Left on, it rejects `.tsx`.

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.tsx",
	module: {
		rules: [
			{
				test: /[\\/]experiments-auto-and-scoped-ts-loader[\\/].*\.(ts|tsx)$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			}
		]
	}
};
