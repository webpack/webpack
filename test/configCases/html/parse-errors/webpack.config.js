"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	module: {
		parser: {
			html: {
				parseErrors: true
			}
		},
		rules: [
			{
				test: /quiet\.html$/,
				parser: {
					parseErrors: false
				}
			}
		]
	},
	experiments: { html: true }
};
