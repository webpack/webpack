"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: true,
		// `"..."` keeps the default minimizer, which is what runs `cssMinify`.
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
