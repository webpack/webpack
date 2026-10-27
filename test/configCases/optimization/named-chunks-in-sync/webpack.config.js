"use strict";

const { optimize } = require("../../../../");

/** @import { Compiler, Configuration } from "../../../../types" */

/**
 * Checks that every name in `compilation.namedChunks` refers to a chunk of the compilation.
 * @param {Compiler} compiler the compiler
 */
const checkNamedChunks = (compiler) => {
	compiler.hooks.compilation.tap("NamedChunksInSync", (compilation) => {
		compilation.hooks.afterSeal.tap("NamedChunksInSync", () => {
			/** @type {string[]} */
			const removed = [];
			for (const [name, chunk] of compilation.namedChunks) {
				if (!compilation.chunks.has(chunk)) removed.push(name);
			}
			expect(removed).toEqual([]);
		});
	});
};

/**
 * @param {string} name config name
 * @param {string} entry entry file
 * @param {Configuration} options options of the config
 * @returns {Configuration} the config
 */
const config = (name, entry, { plugins = [], optimization }) => ({
	name,
	mode: "development",
	entry,
	plugins: [...plugins, checkNamedChunks],
	optimization: {
		splitChunks: false,
		...optimization
	}
});

/** @type {Configuration[]} */
module.exports = [
	// MergeDuplicateChunksPlugin merges the "named" chunk into the unnamed chunk with the same module
	config("merge-duplicate-chunks", "./merge-duplicate-chunks.js", {
		optimization: {
			splitChunks: {
				cacheGroups: {
					default: false,
					defaultVendors: false,
					named: { name: "named", chunks: "async", minSize: 0 }
				}
			}
		}
	}),
	config("limit-chunk-count", "./merge-chunks.js", {
		plugins: [new optimize.LimitChunkCountPlugin({ maxChunks: 2 })]
	}),
	config("min-chunk-size", "./merge-chunks.js", {
		plugins: [new optimize.MinChunkSizePlugin({ minChunkSize: 10000 })]
	}),
	config("aggressive-merging", "./merge-chunks.js", {
		plugins: [new optimize.AggressiveMergingPlugin({ minSizeReduce: 0.1 })]
	}),
	// The only module of the "named" chunk moves to "shared", then RemoveEmptyChunksPlugin removes the chunk
	config("remove-empty-chunks", "./remove-empty-chunks.js", {
		optimization: {
			splitChunks: {
				cacheGroups: {
					default: false,
					defaultVendors: false,
					shared: {
						test: /x\.js$/,
						name: "shared",
						chunks: "async",
						minSize: 0,
						enforce: true,
						reuseExistingChunk: false
					}
				}
			}
		}
	}),
	// The chunk group of an import() of an already available module is never connected and is removed
	config("unconnected-chunk-group", "./unconnected-chunk-group.js", {})
];
