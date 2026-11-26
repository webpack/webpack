"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		mode: "production",
		target: "node",
		optimization: { concatenateModules: { commonjs: true } }
	},
	{
		mode: "production",
		target: "node",
		optimization: { concatenateModules: true }
	}
];
