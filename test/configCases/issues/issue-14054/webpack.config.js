"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: true
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
