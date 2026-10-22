"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ entry: "./conversions.js", pureConversions: false },
	{ entry: "./holes.js", pureConversions: false },
	{ entry: "./holes.js", pureConversions: true }
].map(({ entry, pureConversions }) => ({
	mode: "production",
	entry,
	target: ["web", "es2018"],
	experiments: { futureDefaults: true },
	output: { module: false },
	optimization: {
		minimizer: ["..."],
		minimize: {
			javascript: {
				compress: {
					pure_conversions: pureConversions,
					pure_getters: false
				}
			}
		}
	}
}));
