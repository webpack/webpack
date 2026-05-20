"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	optimization: {
		concatenateModules: true,
		minimize: false,
		usedExports: true,
		chunkIds: "named",
		moduleIds: "named"
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
			},
			{
				test: /\.text$/,
				type: "asset/bytes"
			}
		]
	}
};
