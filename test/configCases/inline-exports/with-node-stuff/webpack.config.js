"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	node: {
		global: true,
		__filename: false
	},
	optimization: {
		minimize: false,
		inlineExports: true
	}
};
