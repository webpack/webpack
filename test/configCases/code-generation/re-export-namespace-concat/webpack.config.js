"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	mode: "production",
	optimization: {
		mangleExports: "size"
	}
};
