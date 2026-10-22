"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = ["array", "regexp"].map((name) => ({
	mode: "production",
	target: ["web", "es2018"],
	entry: `./${name}.js`,
	experiments: { futureDefaults: true },
	output: { module: false },
	optimization: {
		minimizer: ["..."],
		minimize: {
			javascript: {
				compress: { pure_getters: false, pure_conversions: false }
			}
		}
	}
}));
