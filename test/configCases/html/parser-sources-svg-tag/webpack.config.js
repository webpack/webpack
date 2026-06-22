"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		parser: {
			html: {
				sources: [
					{ tag: "feimage", attribute: "href", type: "src" },
					{ tag: "foreignObject", attribute: "data-src", type: "src" }
				]
			}
		}
	},
	experiments: {
		html: true
	}
};
