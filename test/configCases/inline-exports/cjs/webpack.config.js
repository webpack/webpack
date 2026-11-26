"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = {
	entry: "./index.cjs",
	output: {
		pathinfo: false
	},
	optimization: {
		moduleIds: "named",
		inlineExports: true
	}
};
