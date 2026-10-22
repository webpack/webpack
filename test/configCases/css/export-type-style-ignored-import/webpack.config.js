"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = ["development", "production"].map((mode, index) => ({
	target: "web",
	mode,
	devtool: false,
	output: {
		filename: `bundle${index}.js`
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/auto",
				parser: {
					exportType: "style"
				}
			}
		]
	},
	experiments: {
		css: true
	},
	plugins: [new webpack.IgnorePlugin({ resourceRegExp: /ignored\.css$/ })]
}));
