"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: { main: "./index.js", other: "./other.js" },
	output: {
		filename: "[name].js",
		// No [runtime]: both runtimes write the same update manifest filename, so
		// their differing updates collide and are merged (with a warning).
		hotUpdateMainFilename: "[fullhash].hot-update.json"
	},
	optimization: {
		splitChunks: {
			chunks: "initial",
			minSize: 0,
			cacheGroups: {
				shared: { test: /shared/, name: "shared", enforce: true }
			}
		}
	}
};
