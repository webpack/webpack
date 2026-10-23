"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		publicPath: "/public/",
		assetModuleFilename: "assets/[name][ext]"
	},
	module: {
		rules: [
			{
				test: /file\.txt$/,
				resourceQuery: /resource/,
				loader: "./loader",
				options: { type: "asset/resource" },
				type: "javascript/auto"
			},
			{
				test: /file\.txt$/,
				resourceQuery: /inline/,
				loader: "./loader",
				options: { type: "asset/inline" },
				type: "javascript/auto"
			}
		]
	}
};
