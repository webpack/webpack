"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "browserslist: chrome 120",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: true,
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
