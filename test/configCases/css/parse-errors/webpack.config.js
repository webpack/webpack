"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		parser: {
			css: {
				parseErrors: true
			}
		},
		rules: [
			{
				test: /quiet\.css$/,
				parser: {
					parseErrors: false
				}
			}
		]
	}
};
