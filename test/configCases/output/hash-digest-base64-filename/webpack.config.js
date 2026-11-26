"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		chunkFilename: "[name].[contenthash:8].js",
		hashDigest: "base64"
	}
};
