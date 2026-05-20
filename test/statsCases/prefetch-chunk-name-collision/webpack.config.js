"use strict";

/** @type {import("../../../").Configuration} */
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
