"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	// custom loader-context values; must not clobber the runner's own fields
	loader: { context: "OVERRIDDEN" },
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
