"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "production",
	// a namespace member call keeps the namespace as `this`
	module: { strictThisContextOnImports: true },
	stats: { optimizationBailout: true },
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
		concatenateModules: { crossChunkImports: true },
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
