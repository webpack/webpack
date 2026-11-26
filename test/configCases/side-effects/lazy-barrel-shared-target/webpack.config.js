"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	module: {
		parser: {
			javascript: {
				exportsPresence: "error"
			}
		}
	},
	optimization: {
		sideEffects: true,
		usedExports: true,
		providedExports: true,
		concatenateModules: false,
		minimize: false
	}
};
