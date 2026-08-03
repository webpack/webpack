"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	},
	module: {
		rules: [
			{
				test: /\.svg$/,
				type: "asset/source"
			},
			{
				test: /\.jpg$/,
				type: "asset/inline"
			},
			{
				test: /\.png$/,
				type: "asset/resource"
			}
		]
	}
};
