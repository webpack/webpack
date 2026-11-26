"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	mode: "development",
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.js$/i,
				extractSourceMap: true
			}
		]
	}
};

module.exports = config;
