"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.ts",
	experiments: {
		typescript: true
	},
	optimization: {
		minimize: false
	}
};
