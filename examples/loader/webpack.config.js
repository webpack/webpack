"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	// mode: "development" || "production",
	module: {
		rules: [
			{
				test: /\.css$/,
				loader: "css-loader"
			}
		]
	}
};

module.exports = config;
