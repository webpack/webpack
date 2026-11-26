"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	optimization: { minimize: false },
	output: {
		// the browser resolves this from the script url; the manifest cannot
		publicPath: "auto"
	},
	plugins: [new SSRManifestPlugin()]
};
