/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	compareModulesByIndex,
	compareModulesByIndex2
} = require("../util/comparators");

/** @typedef {import("../Compiler")} Compiler */

class ChunkModuleIdRangePlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap("ChunkModuleIdRangePlugin", compilation => {
			const moduleGraph = compilation.moduleGraph;
			compilation.hooks.moduleIds.tap("ChunkModuleIdRangePlugin", modules => {
				const chunkGraph = compilation.chunkGraph;
				const chunk = compilation.chunks.find(
					chunk => chunk.name === options.name
				);
				if (!chunk) {
					throw new Error(
						`ChunkModuleIdRangePlugin: Chunk with name '${
							options.name
						}"' was not found`
					);
				}

				let chunkModules;
				if (options.order) {
					let cmpFn;
					switch (options.order) {
						case "index":
							cmpFn = compareModulesByIndex(moduleGraph);
							break;
						case "index2":
							cmpFn = compareModulesByIndex2(moduleGraph);
							break;
						default:
							throw new Error(
								"ChunkModuleIdRangePlugin: unexpected value of order"
							);
					}
					chunkModules = chunkGraph.getOrderedChunkModules(chunk, cmpFn);
				} else {
					chunkModules = modules.filter(m => {
						return chunkGraph.isModuleInChunk(m, chunk);
					});
				}

				let currentId = options.start || 0;
				for (let i = 0; i < chunkModules.length; i++) {
					const m = chunkModules[i];
					if (chunkGraph.getModuleId(m) === null) {
						chunkGraph.setModuleId(m, currentId++);
					}
					if (options.end && currentId > options.end) break;
				}
			});
		});
	}
}
module.exports = ChunkModuleIdRangePlugin;
