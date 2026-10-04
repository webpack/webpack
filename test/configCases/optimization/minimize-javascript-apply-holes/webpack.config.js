"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	optimization: {
		minimize: {
			javascript: {
				compress: { unsafe: true, passes: 2 }
			}
		},
		minimizer: ["..."]
	},
	experiments: {
		futureDefaults: true
	}
};
