"use strict";

const webpack = require("../../../../");

/**
 * Returns the configuration for one runtime placement.
 * @param {number} index the configuration index
 * @param {boolean} runtimeChunk whether the runtime gets a chunk of its own
 * @param {string=} secondEntry a second entry sharing the chunk
 * @returns {import("../../../../types").Configuration} configuration
 */
const config = (index, runtimeChunk, secondEntry) => ({
	mode: "production",
	target: "node",
	entry: secondEntry
		? { [`bundle${index}`]: "./index.js", [`other${index}`]: secondEntry }
		: { [`bundle${index}`]: "./index.js" },
	stats: { optimizationBailout: true },
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: `[name]-${index}.mjs`
	},
	plugins: [new webpack.DefinePlugin({ CONFIG_INDEX: index })],
	optimization: {
		minimize: false,
		concatenateModules: { crossChunkImports: "always" },
		runtimeChunk: runtimeChunk ? { name: `runtime-${index}` } : false,
		splitChunks: {
			cacheGroups: {
				shared: {
					test: /[\\/]shared[\\/]/,
					name: `shared-${index}`,
					chunks: "all",
					minSize: 0,
					enforce: true
				}
			}
		}
	}
});

module.exports = [
	config(0, true),
	config(1, false),
	// a runtime per entry
	config(2, false, "./other.js"),
	// the second entry loads the chunk on demand
	config(3, true, "./other-lazy.js")
];
