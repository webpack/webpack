"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		mode: "production",
		optimization: { inlineExports: true, minimize: false }
	},
	{
		mode: "production",
		optimization: { inlineExports: true }
	}
];
