"use strict";

const ChunkImportMapPlugin = require("../../../../lib/esm/ChunkImportMapPlugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2022"],
	node: {
		__dirname: false,
		__filename: false
	},
	externalsPresets: {
		node: true
	},
	module: {
		parser: {
			javascript: {
				importMeta: false
			}
		},
		generator: {
			html: {
				extract: true
			}
		}
	},
	output: {
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		htmlFilename: "[name].html",
		module: true
	},
	optimization: {
		chunkIds: "named",
		// Gives each page's module-script chunk a static inter-chunk import, so
		// the import map has something to map.
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /vendor\.js$/,
					name: "vendor",
					chunks: "all",
					enforce: true
				}
			}
		}
	},
	experiments: {
		html: true,
		outputModule: true
	},
	plugins: [new ChunkImportMapPlugin()]
};
