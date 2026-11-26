"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
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
