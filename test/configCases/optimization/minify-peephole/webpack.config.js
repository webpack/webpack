"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: ["web", "es2020"],
	entry: "./statements.js",
	experiments: { futureDefaults: true },
	output: { filename: "statements.js", module: false },
	optimization: {
		minimizer: ["..."],
		minimize: {
			javascript: {
				compress: { passes: 2 },
				mangle: false,
				keep_fnames: true
			}
		}
	}
};
