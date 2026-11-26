"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: {
		a: "./a",
		b: "./b"
	},
	stats: {
		all: false,
		chunkRelations: true,
		chunks: true,
		entrypoints: true,
		chunkGroupChildren: true
	}
};
