"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
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
