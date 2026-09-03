"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// The sheet and target of `minimize-lower-unsupported` with the switch off:
	// what the target cannot read stays written, the rest of the minifier runs.
	target: "browserslist",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: {
			css: {
				lowerUnsupported: false
			}
		},
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
