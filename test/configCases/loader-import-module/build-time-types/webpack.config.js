"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		publicPath: "/public/",
		assetModuleFilename: "assets/[name][ext]"
	},
	module: {
		rules: [
			{
				test: /image\.png$/,
				type: "asset/resource"
			},
			{
				test: /source\.txt$/,
				type: "asset/source"
			},
			{
				test: /text\.css$/,
				resourceQuery: /text/,
				type: "css/global",
				parser: { exportType: "text" }
			},
			{
				test: /values\.js$/,
				loader: "./loader"
			}
		]
	},
	experiments: {
		css: true
	}
};
