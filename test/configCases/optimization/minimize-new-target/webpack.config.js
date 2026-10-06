"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((module) => ({
	target: "node",
	mode: "production",
	experiments: { futureDefaults: true },
	output: { module },
	optimization: {
		minimize: true,
		minimizer: ["..."]
	}
}));
