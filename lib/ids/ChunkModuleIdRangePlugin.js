/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { find } = require("../util/SetHelpers");
const {
	compareModulesByPostOrderIndexOrIdentifier,
	compareModulesByPreOrderIndexOrIdentifier
} = require("../util/comparators");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ChunkGraph").ModuleComparator} ModuleComparator */

/**
 * @typedef {object} ChunkModuleIdRangePluginOptions
 * @property {string} name the chunk name
 * @property {("index" | "index2" | "preOrderIndex" | "postOrderIndex")=} order order
 * @property {number=} start start id
 * @property {number=} end end id
 */

const PLUGIN_NAME = "ChunkModuleIdRangePlugin";

class ChunkModuleIdRangePlugin {
	/**
	 * @param {ChunkModuleIdRangePluginOptions} options options object
	 */
	constructor(options) {
		this.options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const moduleGraph = compilation.moduleGraph;
			compilation.hooks.moduleIds.tap(PLUGIN_NAME, (modules) => {
				const chunkGraph = compilation.chunkGraph;
				const chunk = find(
					compilation.chunks,
					(chunk) => chunk.name === options.name
				);
				if (!chunk) {
					throw new Error(
						`${PLUGIN_NAME}: Chunk with name '${options.name}"' was not found`
					);
				}

				/** @type {Module[]} */
				let chunkModules;
				if (options.order) {
					/** @type {ModuleComparator} */
					let cmpFn;
					switch (options.order) {
						case "index":
						case "preOrderIndex":
							cmpFn = compareModulesByPreOrderIndexOrIdentifier(moduleGraph);
							break;
						case "index2":
						case "postOrderIndex":
							cmpFn = compareModulesByPostOrderIndexOrIdentifier(moduleGraph);
							break;
						default:
							throw new Error(`${PLUGIN_NAME}: unexpected value of order`);
					}
					chunkModules = chunkGraph.getOrderedChunkModules(chunk, cmpFn);
				} else {
					chunkModules = [...modules]
						.filter((m) => chunkGraph.isModuleInChunk(m, chunk))
						.sort(compareModulesByPreOrderIndexOrIdentifier(moduleGraph));
				}

				let currentId = options.start || 0;
				for (let i = 0; i < chunkModules.length; i++) {
					const m = chunkModules[i];
					if (m.needId && chunkGraph.getModuleId(m) === null) {
						chunkGraph.setModuleId(m, currentId++);
					}
					if (options.end && currentId > options.end) break;
				}
			});
		});
	}
}

module.exports = ChunkModuleIdRangePlugin;
