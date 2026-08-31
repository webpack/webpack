"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	output: {
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /\.svg$/,
				type: "asset/resource"
			}
		]
	},
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				split: {
					test: /a\.svg$|data\.js$/,
					name: "split",
					chunks: "all",
					enforce: true,
					minSize: 0
				}
			}
		}
	}
};
