"use strict";

// A resource hint must not stop `new Worker(new URL(...))` being analyzable — the
// worker reference is itself a statically-followable construct. The hint is fired at
// chunk startup instead of wrapping the href (which would stop the specifier being a
// literal). `devtool: false` so the analyzable form is actually emitted.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	devtool: false,
	output: {
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		module: true,
		chunkFormat: "module",
		workerChunkLoading: "import"
	},
	experiments: {
		outputModule: true
	},
	externals: { fs: "node-commonjs fs", path: "node-commonjs path" },
	performance: { hints: false }
};
