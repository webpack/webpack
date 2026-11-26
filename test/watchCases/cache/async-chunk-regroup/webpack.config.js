"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: {
		type: "filesystem"
	},
	optimization: {
		minimize: false,
		chunkIds: "deterministic",
		moduleIds: "deterministic",
		splitChunks: { chunks: "all", minSize: 0 }
	}
};
