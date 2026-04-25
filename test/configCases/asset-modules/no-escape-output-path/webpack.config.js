"use strict";

module.exports = {
	mode: "production",
	output: {
		assetModuleFilename: "assets/[path][name][ext]"
	},
	module: {
		rules: [
			{
				test: /\.(png|jpg|gif|svg|webp|eot|ttf|woff|woff2)$/i,
				type: "asset/resource"
			}
		]
	}
};
