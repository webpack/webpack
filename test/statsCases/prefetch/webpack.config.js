"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: {
		all: false,
		assets: true,
		ids: true,
		entrypoints: true,
		chunkGroupChildren: true,
		chunkRelations: true,
		chunks: true
	}
};
