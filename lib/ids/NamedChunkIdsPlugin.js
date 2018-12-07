/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RequestShortener = require("../RequestShortener");
const { compareChunksNatural } = require("../util/comparators");
const {
	getShortChunkName,
	getLongChunkName,
	assignNames,
	getUsedChunkIds,
	assignAscendingChunkIds
} = require("./IdHelpers");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class NamedChunkIdsPlugin {
	constructor(options) {
		this.delimiter = (options && options.delimiter) || "~";
		this.context = options && options.context;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NamedChunkIdsPlugin", compilation => {
			compilation.hooks.chunkIds.tap("NamedChunkIdsPlugin", chunks => {
				const chunkGraph = compilation.chunkGraph;
				const context = this.context ? this.context : compiler.context;
				const requestShortener = this.context
					? new RequestShortener(this.context)
					: compilation.requestShortener;
				const delimiter = this.delimiter;

				const unnamedChunks = assignNames(
					Array.from(chunks).filter(chunk => {
						return chunk.id === null;
					}),
					chunk => getShortChunkName(chunk, chunkGraph, context, delimiter),
					chunk =>
						getLongChunkName(
							chunk,
							chunkGraph,
							context,
							requestShortener,
							delimiter
						),
					compareChunksNatural(chunkGraph),
					getUsedChunkIds(compilation),
					(chunk, name) => {
						chunk.id = name;
						chunk.ids = [name];
					}
				);
				if (unnamedChunks.length > 0) {
					assignAscendingChunkIds(unnamedChunks, compilation);
				}

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
			});
		});
	}
}

module.exports = NamedChunkIdsPlugin;
