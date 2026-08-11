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
		}
	},
	// `app` carries the inter-chunk import; `main` is the test itself and must
	// stay resolvable for the harness, so it imports nothing across chunks.
	entry: {
		main: "./index.js",
		app: "./app.js"
	},
	output: {
		filename: "[name].[contenthash].mjs",
		chunkFilename: "[name].[contenthash].mjs",
		module: true
	},
	optimization: {
		chunkIds: "named",
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
		outputModule: true
	},
	plugins: [new ChunkImportMapPlugin({ fileName: "assets/importmap.json" })]
};
