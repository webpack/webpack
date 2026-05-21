"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		filename: "[name].js",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		parser: {
			html: {
				sources: [
					"...",
					{ tag: "img", attribute: "data-src", type: "src" },
					{ tag: "img", attribute: "data-srcset", type: "srcset" },
					// Omit `tag` to match any element.
					{ attribute: "data-href", type: "src" }
				]
			}
		}
	},
	experiments: {
		html: true
	}
};
