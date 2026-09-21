"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "browserslist: chrome 120",
	mode: "production",
	output: {
		pathinfo: false
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: path.resolve(__dirname, "filler-loader.js")
			}
		]
	},
	optimization: {
		minimize: true,
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
