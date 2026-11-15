"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle: "./index.js",
		second: "./shared.js",
		third: "./shared.js"
	},
	output: {
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /shared\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
