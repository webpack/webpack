"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// the bundle runs to check the requests whose loader cannot be resolved throw
	optimization: {
		emitOnErrors: true
	},
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
