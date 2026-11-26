"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		mode: "production",
		optimization: {
			mangleExports: "size",
			concatenateModules: false,
			minimize: false
		}
	},
	{
		mode: "production",
		optimization: { mangleExports: "size" }
	}
];
