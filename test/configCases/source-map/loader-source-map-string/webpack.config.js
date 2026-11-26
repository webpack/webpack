"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.js$/,
				use: [
					{
						loader: require.resolve("./loader.js")
					}
				]
			}
		]
	}
};

module.exports = config;
