"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		library: "named-system-module",
		libraryTarget: "system"
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
