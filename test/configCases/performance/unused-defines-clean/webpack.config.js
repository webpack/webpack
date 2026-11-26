"use strict";

const { DefinePlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	plugins: [new DefinePlugin({ USED_FLAG: JSON.stringify(true) })]
};
