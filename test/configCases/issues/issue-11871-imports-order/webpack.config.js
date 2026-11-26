"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		mode: "development"
	},
	{
		mode: "production"
	},
	{
		mode: "production",
		optimization: {
			concatenateModules: false
		}
	},
	{
		mode: "development",
		optimization: {
			concatenateModules: true
		}
	}
];
