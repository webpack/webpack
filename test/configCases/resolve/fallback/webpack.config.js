"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	resolve: {
		alias: {
			"#": path.resolve(__dirname, "#")
		},
		fallback: {
			"./b": path.resolve(__dirname, "a")
		}
	}
};
