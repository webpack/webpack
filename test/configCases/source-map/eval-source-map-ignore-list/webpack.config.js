"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	devtool: false,
	plugins: [
		new webpack.EvalSourceMapDevToolPlugin({
			ignoreList: [/ignored\.js/]
		})
	],
	optimization: {
		// Ensure the correct `sourceMappingURL` is detected
		concatenateModules: true
	}
};
