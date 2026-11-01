"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	resolveLoader: {
		alias: {
			"gone-loader": false
		}
	},
	module: {
		rules: [
			{
				test: /b\.js$/,
				use: ["gone-loader", "upper-loader"]
			}
		]
	}
};
