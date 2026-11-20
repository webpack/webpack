"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	output: {
		module: true,
		chunkFormat: "module",
		filename: "bundle0.mjs",
		chunkFilename: "chunks/[name].chunk.mjs"
	},
	optimization: {
		minimize: false,
		// a named id escapes into the binding names
		moduleIds: "named",
		concatenateModules: { linkChunks: true },
		splitChunks: {
			cacheGroups: {
				shared: {
					test: /[\\/]shared[\\/]/,
					name: "shared",
					chunks: "async",
					minChunks: 2,
					minSize: 0,
					enforce: true
				}
			}
		}
	}
};
