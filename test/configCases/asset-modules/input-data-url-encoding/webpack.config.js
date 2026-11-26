"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				dependency: "url",
				type: "asset",
				generator: {
					dataUrl: {
						encoding: false
					}
				}
			}
		]
	},
	target: "web"
};
