"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	cache: {
		type: "memory"
	},
	module: {
		unsafeCache: true,
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
