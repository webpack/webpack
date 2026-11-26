"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: "eval",
	optimization: {
		concatenateModules: false
	},
	resolve: {
		alias: {
			react: path.resolve(__dirname, "react")
		}
	}
};
