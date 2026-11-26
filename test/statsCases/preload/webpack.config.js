"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: {
		all: false,
		assets: true,
		entrypoints: true,
		chunkGroupChildren: true,
		chunks: true
	}
};
