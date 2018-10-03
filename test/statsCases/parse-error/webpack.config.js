"use strict";

module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	stats: {
		timings: false,
		builtAt: false,
		hash: false,
		modules: true,
		chunks: false
	}
};
