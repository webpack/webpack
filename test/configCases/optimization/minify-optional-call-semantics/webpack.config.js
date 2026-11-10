"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = ["object", "eval"].map((name, index) => ({
	mode: "production",
	target: ["web", "es2020"],
	entry: `./${name}.js`,
	experiments: { futureDefaults: true },
	output: { filename: `bundle${index}.js`, module: false },
	optimization: {
		minimizer: ["..."],
		minimize: {
			javascript: {
				compress: { passes: 2, pure_getters: false, pure_conversions: false }
			}
		}
	}
}));
