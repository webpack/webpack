"use strict";

/** @type {import("../../../../").Configuration} */
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
