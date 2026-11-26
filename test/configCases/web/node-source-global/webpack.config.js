"use strict";

const { DefinePlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	node: {
		global: true
	},
	plugins: [
		new DefinePlugin({
			"global.test": "'test'"
		})
	]
};
