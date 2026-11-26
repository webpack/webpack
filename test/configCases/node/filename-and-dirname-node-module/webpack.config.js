"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	output: {
		module: true,
		importMetaName: "custom"
	},
	node: {
		__filename: "node-module",
		__dirname: "node-module"
	}
};
