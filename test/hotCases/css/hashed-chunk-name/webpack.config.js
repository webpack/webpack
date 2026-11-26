"use strict";

/** @import { Configuration } from "../../../../" */

// A stylesheet named by its content moves with every change to it: the update has to
// carry the new name, since the runtime's own name map is refreshed only afterwards.

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		cssChunkFilename: "[name].[contenthash].css"
	},
	experiments: {
		css: true
	}
};
