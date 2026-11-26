"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[path][name][ext]"
	},
	optimization: {
		minimize: false,
		usedExports: true,
		innerGraph: true
	}
};
