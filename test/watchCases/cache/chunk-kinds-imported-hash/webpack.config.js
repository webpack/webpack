"use strict";

const { DefinePlugin } = require("../../../../");

// An HTML page, a CSS chunk and a worker each name hashed files of other
// chunks; changing those chunks must reach every asset naming them.
/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ page: "./page.html" },
	{ main: "./main.js" },
	{ spawn: "./spawn.js" }
].map((entry, index) => ({
	name: `compiler-${index}`,
	mode: "production",
	target: "web",
	cache: { type: "filesystem" },
	entry: {
		bundle: { import: "./index.js", filename: `bundle${index}.mjs` },
		...entry
	},
	experiments: { css: true, html: true },
	output: {
		module: true,
		filename: `[name]-${index}.[contenthash].mjs`,
		chunkFilename: `[name]-${index}.[contenthash].mjs`,
		cssFilename: `[name]-${index}.[contenthash].css`,
		cssChunkFilename: `[name]-${index}.[contenthash].css`,
		htmlFilename: `[name]-${index}.html`,
		clean: false
	},
	node: { __dirname: false },
	plugins: [new DefinePlugin({ NAME: JSON.stringify(`compiler-${index}`) })],
	optimization: {
		minimize: false,
		splitChunks: {
			cacheGroups: {
				lib: {
					name: "lib",
					test: /lib\.js$/,
					chunks: (chunk) => chunk.name !== "bundle",
					enforce: true
				}
			}
		}
	},
	externalsType: "node-commonjs",
	externals: ["fs", "path"]
}));
