"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "production",
		target: "node",
		output: {
			chunkFilename: "[fullhash].result.[id].js",
			library: { name: "abc", type: "commonjs" }
		}
	},
	{
		mode: "production",
		target: "node",
		output: {
			library: { name: "def", type: "umd", auxiliaryComment: "test" }
		},
		plugins: [new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })]
	}
];
