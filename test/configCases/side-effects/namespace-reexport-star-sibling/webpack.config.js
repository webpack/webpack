"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		mode: "development"
	},
	{
		mode: "production",
		optimization: { minimize: false }
	}
];
