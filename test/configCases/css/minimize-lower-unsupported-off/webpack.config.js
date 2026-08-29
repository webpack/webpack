"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// The same sheet and the same target as `minimize-lower-unsupported`, with
	// the one switch off: every spelling the target cannot read stays as it was
	// written, and the rest of the minifier still runs.
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
