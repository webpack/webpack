"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ runtimeChunk: "single", realContentHash: true, hash: "contenthash" },
	{ runtimeChunk: "single", realContentHash: false, hash: "contenthash" },
	{ runtimeChunk: false, realContentHash: true, hash: "contenthash" },
	{ runtimeChunk: false, realContentHash: false, hash: "chunkhash" }
].map(({ runtimeChunk, realContentHash, hash }, index) => ({
	name: `compiler-${index}`,
	mode: "production",
	target: "node",
	cache: { type: "filesystem" },
	entry: {
		bundle: { import: "./index.js", filename: `bundle${index}.mjs` },
		main: "./entry.js",
		// The child sorts before its parent, whose chunk it imports.
		parent: "./parent.js",
		child: { import: "./child.js", dependOn: "parent" }
	},
	output: {
		module: true,
		filename: `[name]-${index}.[${hash}].mjs`,
		chunkFilename: `[name]-${index}.[${hash}].mjs`,
		clean: false
	},
	plugins: [new DefinePlugin({ NAME: JSON.stringify(`compiler-${index}`) })],
	optimization: {
		minimize: false,
		concatenateModules: false,
		chunkIds: "named",
		realContentHash,
		runtimeChunk,
		splitChunks: {
			cacheGroups: {
				lib: {
					name: "lib",
					chunks: (chunk) => chunk.name === "main" || chunk.name === "child",
					test: /lib\.js$/,
					enforce: true
				}
			}
		}
	}
}));
