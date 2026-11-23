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
		concatenateModules: { crossChunkImports: "always" },
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
