"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		name: "cross-module-pure-namespace-import without module concatenation",
		mode: "production",
		optimization: {
			concatenateModules: false
		}
	},
	{
		name: "cross-module-pure-namespace-import with module concatenation",
		mode: "production"
	}
];
