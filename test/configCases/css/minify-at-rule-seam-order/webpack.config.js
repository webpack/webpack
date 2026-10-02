"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "browserslist: chrome 120",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: { css: { extractComments: false } },
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
