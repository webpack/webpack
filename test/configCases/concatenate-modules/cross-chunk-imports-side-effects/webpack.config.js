"use strict";

/**
 * Returns a cache group holding one directory's modules in a chunk of their own.
 * @param {string} name the directory and chunk name
 * @returns {{ test: RegExp, name: string, chunks: "async", minChunks: number, minSize: number, enforce: boolean }} the cache group
 */
const group = (name) => ({
	test: new RegExp(`[\\\\/]${name}[\\\\/]`),
	name,
	chunks: "async",
	minChunks: 2,
	minSize: 0,
	enforce: true
});

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	output: {
		module: true,
		chunkFormat: "module",
		filename: "bundle0.mjs",
		chunkFilename: "[name].chunk.mjs"
	},
	optimization: {
		minimize: false,
		concatenateModules: { crossChunkImports: "always" },
		splitChunks: {
			cacheGroups: {
				shared: group("shared"),
				partial: group("partial"),
				conflict: group("conflict")
			}
		}
	}
};
