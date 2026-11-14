"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		entry: "./web.js",
		output: { publicPath: "/", chunkFilename: "[name].js" },
		optimization: { minimize: false }
	},
	{
		target: "web",
		entry: "./function.js",
		output: { publicPath: "/", chunkFilename: () => "[name].js" },
		optimization: { minimize: false }
	},
	{
		target: "node",
		entry: "./node.js",
		output: { publicPath: "/", chunkFilename: "[name].js" },
		optimization: { minimize: false },
		plugins: [new SSRManifestPlugin()]
	}
];
