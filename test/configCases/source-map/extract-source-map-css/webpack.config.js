"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.css$/i,
				type: "css",
				extractSourceMap: true
			}
		]
	},
	experiments: {
		css: true
	}
};
