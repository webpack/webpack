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
			css: { extractComments: false, charset: false }
		},
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
