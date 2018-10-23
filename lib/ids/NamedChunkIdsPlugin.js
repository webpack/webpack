/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { compareChunksNatural } = require("../util/comparators");
const assignAscendingChunkIds = require("./assignAscendingChunkIds");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

const requestToId = request => {
	return request
		.replace(/^(\.\.?\/)+/, "")
		.replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_");
};

class NamedChunkIdsPlugin {
	/**
	 * @param {Object} options options
	 * @param {string=} options.delimiter delimiter for concatenation of multiple requests
	 * @returns {function(Chunk): string} resolver
	 */
	static createDefaultNameResolver(options) {
		const delimiter = options.delimiter || "~";
		/**
		 * @param {Chunk} chunk a chunk
		 * @returns {string} name
		 */
		const resolver = chunk => {
			if (chunk.name) return chunk.name;
			const set = new Set();
			for (const group of chunk.groupsIterable) {
				for (const block of group.blocksIterable) {
					if (block.request) set.add(requestToId(block.request));
				}
			}
			if (set.size > 0) {
				return Array.from(set)
					.sort()
					.join(delimiter);
			}
			return null;
		};
		return resolver;
	}

	constructor(nameResolverOrOptions) {
		if (typeof nameResolverOrOptions === "function") {
			this.nameResolver = nameResolverOrOptions;
		} else if (
			nameResolverOrOptions &&
			typeof nameResolverOrOptions === "object"
		) {
			this.nameResolver = NamedChunkIdsPlugin.createDefaultNameResolver(
				nameResolverOrOptions
			);
		} else {
			this.nameResolver = NamedChunkIdsPlugin.defaultNameResolver;
		}
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NamedChunkIdsPlugin", compilation => {
			compilation.hooks.chunkIds.tap("NamedChunkIdsPlugin", chunks => {
				const chunkGraph = compilation.chunkGraph;

				/** @type {Map<string, Chunk[]>} */
				const nameToChunksMap = new Map();
				const unnamedChunks = [];
				for (const chunk of chunks) {
					if (chunk.id === null) {
						const name = this.nameResolver(chunk, {
							moduleGraph: compilation.moduleGraph,
							chunkGraph: compilation.chunkGraph
						});
						if (name) {
							let array = nameToChunksMap.get(name);
							if (array === undefined) {
								array = [];
								nameToChunksMap.set(name, array);
							}
							array.push(chunk);
						} else {
							unnamedChunks.push(chunk);
						}
					}
				}

				const compareNatural = compareChunksNatural(chunkGraph);

				const usedIds = new Set();
				if (compilation.usedChunkIds) {
					for (const id of compilation.usedChunkIds) {
						usedIds.add(id);
					}
				}

				for (const chunk of chunks) {
					const chunkId = chunk.id;
					if (chunkId !== null) {
						usedIds.add(chunkId);
					}
				}

				for (const [name, chunks] of nameToChunksMap) {
					if (chunks.length > 1 || usedIds.has(name)) {
						chunks.sort(compareNatural);
						let nextIndex = 0;
						for (const chunk of chunks) {
							while (
								usedIds.has(name + nextIndex) ||
								nameToChunksMap.has(name + nextIndex)
							)
								nextIndex++;
							const id = name + nextIndex;
							chunk.id = id;
							chunk.ids = [id];
							nextIndex++;
						}
					} else {
						const chunk = chunks[0];
						chunk.id = name;
						chunk.ids = [name];
					}
				}

				unnamedChunks.sort(compareNatural);
				assignAscendingChunkIds(unnamedChunks, compilation);
			});
		});
	}
}

NamedChunkIdsPlugin.defaultNameResolver = NamedChunkIdsPlugin.createDefaultNameResolver(
	{}
);

module.exports = NamedChunkIdsPlugin;
