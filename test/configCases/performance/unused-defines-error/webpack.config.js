"use strict";

const { DefinePlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "error",
		unusedConfig: true
	},
	plugins: [
		new DefinePlugin({
			USED_FLAG: JSON.stringify(true),
			UNUSED_FLAG: JSON.stringify(false)
		})
	]
};
