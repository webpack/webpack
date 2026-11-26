"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	resolve: {
		modules: ["...", path.resolve(__dirname, "new-context/modules")]
	},
	plugins: [
		new webpack.ContextReplacementPlugin(
			/replacement.e$/,
			"new-context",
			true,
			/^replaced$|^\.\/modules\/rep/
		)
	]
};
