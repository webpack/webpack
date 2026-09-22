"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// A target that reads no nesting, so the nested selectors are written out.
	target: "browserslist: chrome 100",
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
