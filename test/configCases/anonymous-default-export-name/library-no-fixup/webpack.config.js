"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	output: {
		library: {
			type: "commonjs2"
		}
	},
	optimization: {
		minimize: false
	}
};
