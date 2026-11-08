"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: "source-map",
	entry: {
		bundle0: ["./index.js"],
		asset: ["./asset.scss"]
	},
	output: {
		filename: "[name].js",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		generator: {
			// set in `module.generator`, not on the rule, so it reaches the asset only through its generator
			"asset/resource": {
				binary: false,
				filename: (pathInfo) =>
					/** @type {string} */
					(pathInfo.filename).replace(/\.scss$/, ".css")
			}
		},
		rules: [
			{
				test: /\.scss$/,
				type: "asset/resource",
				use: ["../keep-source-maps/loader.js"]
			},
			{
				test: /value\.js$/,
				// JavaScript is always text, so this does not drop the loader's source map
				generator: { binary: true },
				use: ["./js-loader.js"]
			}
		]
	}
};
