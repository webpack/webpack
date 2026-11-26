"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		filename: "bundle0.[contenthash:1].js",
		chunkFilename: "[name].[contenthash:1].js"
	},
	optimization: { realContentHash: true }
};
