"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		module: true,
		library: { type: "module" }
	},
	optimization: { minimize: false },
	cache: {
		type: "filesystem"
	}
};
