"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: { import: "./index.js?a", filename: "[name].js" },
		b: { import: "./index.js?b", filename: "[name].js" },
		c: { import: "./index.js?c", filename: "[name].js" },
		d: { import: "./index.js?d", filename: "[name].js" }
	},
	output: {
		filename: "[name].[contenthash].js",
		environment: {
			nodePrefixForCoreModules: false
		}
	},
	plugins: [new webpack.HotModuleReplacementPlugin()]
};
