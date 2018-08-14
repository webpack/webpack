/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/optimize/OccurrenceOrderModuleIdsPlugin.json");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */

class OccurrenceOrderModuleIdsPlugin {
	constructor(options = {}) {
		validateOptions(schema, options, "Occurrence Order Module Ids Plugin");
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const prioritiseInitial = this.options.prioritiseInitial;
		compiler.hooks.compilation.tap(
			"OccurrenceOrderModuleIdsPlugin",
			compilation => {
				const moduleGraph = compilation.moduleGraph;
				compilation.hooks.optimizeModuleOrder.tap(
					"OccurrenceOrderModuleIdsPlugin",
					modules => {
						const chunkGraph = compilation.chunkGraph;

						const occursInInitialChunksMap = new Map();
						const occursInAllChunksMap = new Map();

						const initialChunkChunkMap = new Map();
						const entryCountMap = new Map();
						for (const m of modules) {
							let initial = 0;
							let entry = 0;
							for (const c of chunkGraph.getModuleChunksIterable(m)) {
								if (c.canBeInitial()) initial++;
								if (c.entryModule === m) entry++;
							}
							initialChunkChunkMap.set(m, initial);
							entryCountMap.set(m, entry);
						}

						/**
						 * @param {number} sum sum of occurs
						 * @param {ModuleGraphConnection} c connection
						 * @returns {number} count of occurs
						 */
						const countOccursInEntry = (sum, c) => {
							if (!c.originModule) {
								return sum;
							}
							return sum + initialChunkChunkMap.get(c.originModule);
						};

						/**
						 * @param {number} sum sum of occurs
						 * @param {ModuleGraphConnection} c connection
						 * @returns {number} count of occurs
						 */
						const countOccurs = (sum, c) => {
							if (!c.originModule) {
								return sum;
							}
							const factor = c.dependency.getNumberOfIdOccurrences();
							if (factor === 0) {
								return sum;
							}
							return (
								sum +
								factor * chunkGraph.getNumberOfModuleChunks(c.originModule)
							);
						};

						if (prioritiseInitial) {
							for (const m of modules) {
								const result =
									moduleGraph
										.getIncomingConnections(m)
										.reduce(countOccursInEntry, 0) +
									initialChunkChunkMap.get(m) +
									entryCountMap.get(m);
								occursInInitialChunksMap.set(m, result);
							}
						}

						const originalOrder = new Map();
						let i = 0;
						for (const m of modules) {
							const result =
								moduleGraph.getIncomingConnections(m).reduce(countOccurs, 0) +
								chunkGraph.getNumberOfModuleChunks(m) +
								entryCountMap.get(m);
							occursInAllChunksMap.set(m, result);
							originalOrder.set(m, i++);
						}

						modules.sort((a, b) => {
							if (prioritiseInitial) {
								const aEntryOccurs = occursInInitialChunksMap.get(a);
								const bEntryOccurs = occursInInitialChunksMap.get(b);
								if (aEntryOccurs > bEntryOccurs) return -1;
								if (aEntryOccurs < bEntryOccurs) return 1;
							}
							const aOccurs = occursInAllChunksMap.get(a);
							const bOccurs = occursInAllChunksMap.get(b);
							if (aOccurs > bOccurs) return -1;
							if (aOccurs < bOccurs) return 1;
							const orgA = originalOrder.get(a);
							const orgB = originalOrder.get(b);
							return orgA - orgB;
						});
					}
				);
			}
		);
	}
}

module.exports = OccurrenceOrderModuleIdsPlugin;
