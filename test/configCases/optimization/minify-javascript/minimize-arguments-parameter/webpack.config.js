"use strict";

/** @import { Configuration } from "../../../../../" */

/** @type {Configuration[]} */
module.exports = [
	false,
	true,
	{ javascript: { compress: { unused: false, passes: 2 } } }
].map((minimize, index) => ({
	target: "node",
	mode: "production",
	experiments: { futureDefaults: true },
	output: { module: false, filename: `bundle${index}.js` },
	optimization: {
		minimize,
		minimizer: ["..."]
	}
}));
