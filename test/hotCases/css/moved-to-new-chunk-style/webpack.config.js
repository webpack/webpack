"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js" },
	experiments: {
		css: true
	},
	module: {
		parser: {
			"css/auto": { exportType: "style" }
		}
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				styles: {
					test: /style\.css$/,
					name: "shared",
					chunks: "all",
					minChunks: 2,
					enforce: true
				}
			}
		}
	}
};
