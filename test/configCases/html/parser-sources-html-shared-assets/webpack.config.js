"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		generator: {
			// Emit `.css` files under the default (node) target so the test can
			// read the emitted pages from disk with `fs`.
			css: {
				exportsOnly: false
			}
		},
		parser: {
			html: {
				sources: ["...", { tag: "a", attribute: "href", type: "html" }]
			}
		}
	},
	experiments: {
		html: true,
		css: true
	}
};
