"use strict";

const ChunkImportMapPlugin = require("../../../../lib/esm/ChunkImportMapPlugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2022"],
	devtool: false,
	// `app` carries the inter-chunk import and is never executed; `main` is the
	// test itself, so it must stay free of rewritten imports.
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
	plugins: [new ChunkImportMapPlugin()]
};
