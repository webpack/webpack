"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		mode: "none",
		optimization: {
			usedExports: true,
			innerGraph: true,
			providedExports: true
		}
	},
	{
		mode: "production"
	}
];
