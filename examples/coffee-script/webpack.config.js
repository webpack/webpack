"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	// mode: "development" || "production",
	module: {
		rules: [
			{
				test: /\.coffee$/,
				loader: "coffee-loader"
			}
		]
	},
	resolve: {
		extensions: [".web.coffee", ".web.js", ".coffee", ".js"]
	}
};

module.exports = config;
