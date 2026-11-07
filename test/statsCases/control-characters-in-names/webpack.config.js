"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index.js",
	stats: {
		assets: true,
		chunks: true,
		chunkOrigins: true,
		modules: true,
		reasons: true,
		colors: true
	}
};
