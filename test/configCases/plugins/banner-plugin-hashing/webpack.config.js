"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		"dist/banner": ["./index.js"],
		vendors: ["./vendors.js"]
	},
	output: {
		filename: "[name].js?value"
	},
	plugins: [
		new webpack.BannerPlugin({
			banner:
				"fullhash:[fullhash], chunkhash:[chunkhash], name:[name], base:[base], query:[query], file:[file], path:[path], ext:[ext]"
		})
	]
};
