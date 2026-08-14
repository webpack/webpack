"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// es5 has no arrow functions, so the bootstrap IIFE is a plain function
	target: ["web", "es5"],
	entry: { main: "./index.js" },
	optimization: { runtimeChunk: "single" },
	output: {
		filename: "[name].js",
		globalObject: "this",
		chunkLoadingGlobal: "webpackChunkGlobalObjectThisStrictRuntime"
	}
};
