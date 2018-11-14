/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/ids/OccurrenceModuleIdsPlugin.json");
const {
	compareModulesByPreOrderIndexOrIdentifier
} = require("../util/comparators");
const assignAscendingModuleIds = require("./assignAscendingModuleIds");

/** @typedef {import("../../declarations/plugins/ids/OccurrenceModuleIdsPlugin").OccurrenceModuleIdsPluginOptions} OccurrenceModuleIdsPluginOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */

class OccurrenceModuleIdsPlugin {
	/**
	 * @param {OccurrenceModuleIdsPluginOptions=} options options object
	 */
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
		compiler.hooks.compilation.tap("OccurrenceModuleIdsPlugin", compilation => {
			const moduleGraph = compilation.moduleGraph;

			/** @type {function(Module): void} */
			let assignIdToModule;

			compilation.hooks.moduleIds.tap("OccurrenceModuleIdsPlugin", modules => {
				const chunkGraph = compilation.chunkGraph;

				const modulesInOccurrenceOrder = Array.from(modules).filter(
					m => chunkGraph.getNumberOfModuleChunks(m) > 0
				);

				const occursInInitialChunksMap = new Map();
				const occursInAllChunksMap = new Map();

				const initialChunkChunkMap = new Map();
				const entryCountMap = new Map();
				for (const m of modulesInOccurrenceOrder) {
					let initial = 0;
					let entry = 0;
					for (const c of chunkGraph.getModuleChunksIterable(m)) {
						if (c.canBeInitial()) initial++;
						if (chunkGraph.isEntryModuleInChunk(m, c)) entry++;
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
						sum + factor * chunkGraph.getNumberOfModuleChunks(c.originModule)
					);
				};

				if (prioritiseInitial) {
					for (const m of modulesInOccurrenceOrder) {
						const result =
							moduleGraph
								.getIncomingConnections(m)
								.reduce(countOccursInEntry, 0) +
							initialChunkChunkMap.get(m) +
							entryCountMap.get(m);
						occursInInitialChunksMap.set(m, result);
					}
				}

				for (const m of modules) {
					const result =
						moduleGraph.getIncomingConnections(m).reduce(countOccurs, 0) +
						chunkGraph.getNumberOfModuleChunks(m) +
						entryCountMap.get(m);
					occursInAllChunksMap.set(m, result);
				}

				const naturalCompare = compareModulesByPreOrderIndexOrIdentifier(
					compilation.moduleGraph
				);

				modulesInOccurrenceOrder.sort((a, b) => {
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
					return naturalCompare(a, b);
				});

				assignIdToModule = assignAscendingModuleIds(
					modulesInOccurrenceOrder,
					compilation
				);
			});
			compilation.hooks.runtimeModule.tap(
				"OccurrenceModuleIdsPlugin",
				module => {
					assignIdToModule(module);
				}
			);
		});
	}
}

module.exports = OccurrenceModuleIdsPlugin;
