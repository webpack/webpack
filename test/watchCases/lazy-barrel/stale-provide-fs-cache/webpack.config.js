"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	cache: {
		type: "filesystem"
	},
	module: {
		parser: {
			javascript: {
				exportsPresence: "error"
			}
		},
		rules: [
			{
				test: /pkg/,
				sideEffects: false
			}
		]
	}
};
