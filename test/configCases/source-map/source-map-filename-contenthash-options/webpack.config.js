"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map",
	output: {
		hashFunction: "sha256",
		hashSalt: "salt",
		hashDigestLength: 12,
		sourceMapFilename: "[file]-[contenthash].map"
	}
};
