"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map",
	optimization: {
		minimize: true
	}
};
