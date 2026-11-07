"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index.js",
	stats: {
		assets: true,
		chunks: true,
		chunkOrigins: true,
		chunkRelations: true,
		ids: true,
		modules: true,
		reasons: true,
		colors: true
	}
};
