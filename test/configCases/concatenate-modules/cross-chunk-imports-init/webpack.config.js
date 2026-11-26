"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

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

/**
 * Returns the configuration for one value of the option.
 * @param {number} index the configuration index
 * @param {true | "always"} crossChunkImports the option value
 * @param {string=} entry the entry, when not the shared one
 * @param {boolean=} strictModuleErrorHandling whether a failed module rethrows its error
 * @returns {Configuration} configuration
 */
const config = (
	index,
	crossChunkImports,
	entry,
	strictModuleErrorHandling
) => ({
	mode: "production",
	target: "node",
	entry: entry || "./index.js",
	stats: { optimizationBailout: true },
	output: {
		module: true,
		chunkFormat: "module",
		filename: `bundle${index}.mjs`,
		chunkFilename: `[name]-${index}.chunk.mjs`,
		strictModuleErrorHandling
	},
	optimization: {
		minimize: false,
		concatenateModules: { crossChunkImports },
		splitChunks: {
			cacheGroups: { shared: group("shared"), deep: group("deep") }
		}
	}
});

module.exports = [
	config(0, "always"),
	config(1, true),
	config(2, "always", "./failing.js", true)
];
