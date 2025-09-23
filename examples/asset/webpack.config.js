"use strict";

module.exports = {
	output: {
		assetModuleFilename: "images/[hash][ext]"
	},
	module: {
		rules: [
			{
				test: /file\.(png|jpg|svg)$/,
				type: "asset"
			},
		]
	}
};
