"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		name: "cross-module-pure-normal without module concatenation",
		mode: "production",
		optimization: {
			concatenateModules: false
		}
	},
	{
		name: "cross-module-pure-normal with module concatenation",
		mode: "production"
	}
];
