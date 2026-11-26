"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.js$/,
				parser: {
					system: true
				}
			}
		]
	}
};
