"use strict";

const IgnorePlugin = require("../../../../").IgnorePlugin;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: "./test.js",
	externals: {
		"./normal-module": "{}"
	},
	plugins: [
		new IgnorePlugin({
			resourceRegExp: /ignored-module1/
		}),
		new IgnorePlugin({
			resourceRegExp: /ignored-module2/
		})
	]
};
