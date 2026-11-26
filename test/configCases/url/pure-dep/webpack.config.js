"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[path][name][ext]"
	},
	optimization: {
		minimize: false,
		innerGraph: true
	},
	module: {
		parser: {
			javascript: {
				dynamicUrl: true
			}
		}
	}
};
