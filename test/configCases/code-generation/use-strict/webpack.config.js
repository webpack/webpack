"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	optimization: {
		concatenateModules: false,
		minimize: false
	}
};
