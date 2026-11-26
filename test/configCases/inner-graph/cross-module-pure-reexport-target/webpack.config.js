"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		name: "cross-module-pure-reexport-target without module concatenation",
		mode: "production",
		optimization: {
			concatenateModules: false
		}
	},
	{
		name: "cross-module-pure-reexport-target with module concatenation",
		mode: "production"
	}
];
