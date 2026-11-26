"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	devtool: false,
	mode: "development",
	optimization: {
		runtimeChunk: "single",
		splitChunks: { chunks: "all", name: "common" }
	}
};
