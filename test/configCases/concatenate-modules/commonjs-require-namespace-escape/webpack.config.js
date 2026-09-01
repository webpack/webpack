"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	output: {
		filename: "[name].js"
	},
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		mangleExports: true,
		moduleIds: "named",
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				split: {
					test: /-target\.js$/,
					name: "split",
					chunks: "all",
					enforce: true,
					minSize: 0
				}
			}
		}
	}
};
