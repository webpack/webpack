"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: {
		entry: "./entry"
	},
	module: {
		parser: {
			javascript: {
				dynamicImportMode: "weak"
			}
		}
	}
};
