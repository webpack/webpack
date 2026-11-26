"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		output: {
			globalObject: "null || new Function('return this')()"
		}
	},
	{
		output: {
			globalObject: "(new Function('return this'))()"
		}
	},
	{
		output: {
			globalObject: "1 > 2 ? null : new Function('return this')()"
		}
	}
];
