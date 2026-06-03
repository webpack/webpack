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
					{
						tag: "img",
						attribute: "src",
						type: "src",
						filter: (attrs) => attrs.get("data-size") === "large"
					},
					{
						attribute: "href",
						type: "src",
						filter: (attrs) => attrs.get("rel") === "icon"
					}
				]
			}
		}
	},
	experiments: {
		html: true
	}
};
