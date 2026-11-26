"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
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
