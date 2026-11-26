"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /m\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
