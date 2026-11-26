"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/auto",
				parser: { exportType: "text" }
			}
		]
	},
	experiments: { css: true }
};
