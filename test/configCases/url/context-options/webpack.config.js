"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[path][name][ext]"
	},
	module: {
		parser: {
			javascript: {
				dynamicUrl: true
			}
		}
	}
};
