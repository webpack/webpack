"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		main: "./index.js",
		"entry\u001B[2mDIM": "./c.js"
	},
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
