"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/i,
				type: "css"
			}
		]
	},
	experiments: {
		css: true
	}
};
