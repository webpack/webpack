"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	devtool: false,
	mode: "development",
	optimization: {
		runtimeChunk: "single",
		splitChunks: { chunks: "all", name: "common" }
	}
};
