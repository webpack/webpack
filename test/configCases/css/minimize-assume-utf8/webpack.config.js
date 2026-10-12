"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: {
			css: { extractComments: false, assumeUtf8: true }
		},
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
