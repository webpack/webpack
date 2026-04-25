"use strict";

/** @type {import("../../../../").Configuration} */
const common = {
	target: "web",
	optimization: {
		realContentHash: false
	},
	experiments: {
		css: true
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		...common,
		output: {
			filename: "bundle0.[contenthash].js",
			chunkFilename: "css0/[name].[contenthash].js",
			cssChunkFilename: "css0/[name].[contenthash].css"
		},
		module: {
			rules: [
				{
					test: /\.css$/,
					type: "css/module",
					generator: {
						exportType: "text"
					}
				}
			]
		}
	},
	{
		...common,
		output: {
			filename: "bundle1.[contenthash].js",
			chunkFilename: "css1/[name].[contenthash].js",
			cssChunkFilename: "css1/[name].[contenthash].css"
		},
		module: {
			rules: [
				{
					test: /\.css$/,
					type: "css/module",
					generator: {
						exportType: "css-style-sheet"
					}
				}
			]
		}
	}
];
