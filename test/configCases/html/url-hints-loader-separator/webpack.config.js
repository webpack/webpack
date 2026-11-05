"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	experiments: {
		html: true
	},
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "https://example.com/public/"
	},
	module: {
		parser: {
			html: {
				urlHints: [{ test: /a!b\.png$/, prefetch: true }]
			}
		}
	}
};
