"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		pathinfo: false,
		assetModuleFilename: "handled-[name][ext]"
	},
	module: {
		parser: {
			html: {
				// The built-in `iframe[srcdoc]` handling lives in the `sources` option
				// (kept via "..."), so the same `srcdoc` type can be applied to any
				// other tag/attribute — here a custom `div[data-html]`.
				sources: ["...", { tag: "div", attribute: "data-html", type: "srcdoc" }]
			}
		}
	},
	experiments: {
		html: true
	}
};
