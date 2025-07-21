"use strict";

/** @typedef {import("../../../../").GeneratorOptionsByModuleTypeKnown} GeneratorOptionsByModuleTypeKnown */

/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
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
		rules: [
			{
				test: /\.scss$/i,
				type: "asset/resource",
				/** @type {GeneratorOptionsByModuleTypeKnown['asset/resource']} */
				generator: {
					binary: false,
					filename: (pathInfo) =>
						/** @type {string} */
						(pathInfo.filename).replace(/\.scss/gi, ".css")
				},
				use: ["./loader.js"]
			}
		]
	}
};
