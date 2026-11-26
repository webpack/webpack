"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		mode: "production",
		optimization: { mangleExports: false }
	},
	{
		mode: "production",
		optimization: { mangleExports: false, concatenateModules: false }
	},
	{
		mode: "production",
		optimization: { mangleExports: false },
		module: { generator: { json: { JSONParse: false } } }
	},
	{
		mode: "development",
		optimization: { usedExports: true, mangleExports: false }
	}
];
