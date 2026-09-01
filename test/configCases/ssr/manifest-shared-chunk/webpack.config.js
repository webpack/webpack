"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	optimization: {
		minimize: false,
		// keep `shared` in a chunk of its own so the manifest has to describe it
		concatenateModules: false,
		chunkIds: "named",
		splitChunks: { chunks: "all", minSize: 0 }
	},
	plugins: [new SSRManifestPlugin()]
};
