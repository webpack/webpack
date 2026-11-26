"use strict";

const IgnorePlugin = require("../../../../").IgnorePlugin;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: "./test.js",
	plugins: [
		new IgnorePlugin({
			resourceRegExp: /ignored-module/
		})
	]
};
