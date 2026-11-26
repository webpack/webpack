"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	output: {
		assetModuleFilename: "[name].[contenthash:8][ext]"
	}
};
