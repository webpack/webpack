"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./conversions.js",
	target: ["web", "es2018"],
	experiments: { futureDefaults: true },
	output: { module: false },
	optimization: {
		minimizer: ["..."],
		minimize: {
			javascript: {
				compress: {
					pure_conversions: false,
					pure_getters: false
				}
			}
		}
	}
};
