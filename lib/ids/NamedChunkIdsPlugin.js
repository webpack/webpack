/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { compareChunksNatural } = require("../util/comparators");
const {
	assignAscendingChunkIds,
	assignNames,
	getLongChunkName,
	getShortChunkName,
	getUsedChunkIds
} = require("./IdHelpers");

/** @import Compiler from "../Compiler" */
/** @import Chunk from "../graph/Chunk" */

/**
 * Defines the named chunk ids plugin options type used by this module.
 * @typedef {object} NamedChunkIdsPluginOptions
 * @property {string=} context context
 * @property {string=} delimiter delimiter
 */

const PLUGIN_NAME = "NamedChunkIdsPlugin";

/**
 * Whether a name is an own key of `Object.prototype`, such as `toString` or `__proto__`:
 * runtime code keys plain objects by chunk id, so such an id reads an inherited member
 * or, for `__proto__`, replaces the prototype instead of storing a value.
 * @param {string} name a chunk name
 * @returns {boolean} true, when the name can't be a chunk id
 */
const isObjectPrototypeKey = (name) => name in Object.prototype;

class NamedChunkIdsPlugin {
	/**
	 * Creates an instance of NamedChunkIdsPlugin.
	 * @param {NamedChunkIdsPluginOptions=} options options
	 */
	constructor(options = {}) {
		/** @type {NamedChunkIdsPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const hashFunction = compilation.outputOptions.hashFunction;
			compilation.hooks.chunkIds.tap(PLUGIN_NAME, (chunks) => {
				const chunkGraph = compilation.chunkGraph;
				const context = this.options.context
					? this.options.context
					: compiler.context;
				const delimiter = this.options.delimiter || "-";

				/** @type {Chunk[]} */
				const reservedNameChunks = [];
				const chunksToName = [...chunks].filter((chunk) => {
					if (chunk.name) {
						if (isObjectPrototypeKey(chunk.name)) {
							reservedNameChunks.push(chunk);
							return false;
						}
						chunk.id = chunk.name;
						chunk.ids = [chunk.name];
					}
					return chunk.id === null;
				});
				const usedIds = getUsedChunkIds(compilation);
				for (const name of Object.getOwnPropertyNames(Object.prototype)) {
					usedIds.add(name);
				}
				for (const chunk of reservedNameChunks) {
					const name = /** @type {string} */ (chunk.name);
					let i = 0;
					while (usedIds.has(name + i)) i++;
					chunk.id = name + i;
					chunk.ids = [chunk.id];
					usedIds.add(chunk.id);
				}
				const unnamedChunks = assignNames(
					chunksToName,
					(chunk) =>
						getShortChunkName(
							chunk,
							chunkGraph,
							context,
							delimiter,
							hashFunction,
							compiler.root
						),
					(chunk) =>
						getLongChunkName(
							chunk,
							chunkGraph,
							context,
							delimiter,
							hashFunction,
							compiler.root
						),
					compareChunksNatural(chunkGraph),
					usedIds,
					(chunk, name) => {
						chunk.id = name;
						chunk.ids = [name];
					}
				);
				if (unnamedChunks.length > 0) {
					assignAscendingChunkIds(unnamedChunks, compilation);
				}
			});
		});
	}
}

module.exports = NamedChunkIdsPlugin;
