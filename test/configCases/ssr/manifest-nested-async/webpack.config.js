"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	optimization: {
		minimize: false,
		chunkIds: "named"
	},
	plugins: [new SSRManifestPlugin()]
};
