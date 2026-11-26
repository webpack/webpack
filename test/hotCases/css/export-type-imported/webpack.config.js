"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /.css$/,
				type: "css/module",
				parser: {
					exportType: "text"
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
