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
const { assignAscendingModuleIds } = require("./IdHelpers");

/** @typedef {import("../../declarations/plugins/ids/OccurrenceModuleIdsPlugin").OccurrenceModuleIdsPluginOptions} OccurrenceModuleIdsPluginOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */

class OccurrenceModuleIdsPlugin {
	/**
	 * @param {OccurrenceModuleIdsPluginOptions=} options options object
	 */
	constructor(options = {}) {
		validateOptions(schema, options, {
			name: "Occurrence Order Module Ids Plugin",
			baseDataPath: "options"
		});
		this.options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const prioritiseInitial = this.options.prioritiseInitial;
		compiler.hooks.compilation.tap("OccurrenceModuleIdsPlugin", compilation => {
			const moduleGraph = compilation.moduleGraph;

			compilation.hooks.moduleIds.tap("OccurrenceModuleIdsPlugin", modules => {
				const chunkGraph = compilation.chunkGraph;

				const modulesInOccurrenceOrder = Array.from(modules).filter(
					m =>
						m.needId &&
						chunkGraph.getNumberOfModuleChunks(m) > 0 &&
						chunkGraph.getModuleId(m) === null
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
				 * @param {Iterable<ModuleGraphConnection>} connections connections
				 * @returns {number} count of occurs
				 */
				const countOccursInEntry = connections => {
					let sum = 0;
					for (const c of connections) {
						if (!c.isActive(undefined)) continue;
						if (!c.originModule) continue;
						sum += initialChunkChunkMap.get(c.originModule);
					}
					return sum;
				};

				/**
				 * @param {Iterable<ModuleGraphConnection>} connections connections
				 * @returns {number} count of occurs
				 */
				const countOccurs = connections => {
					let sum = 0;
					for (const c of connections) {
						if (!c.isActive(undefined)) continue;
						if (!c.originModule) continue;
						if (!c.dependency) continue;
						const factor = c.dependency.getNumberOfIdOccurrences();
						if (factor === 0) continue;
						sum += factor * chunkGraph.getNumberOfModuleChunks(c.originModule);
					}
					return sum;
				};

				if (prioritiseInitial) {
					for (const m of modulesInOccurrenceOrder) {
						const result =
							countOccursInEntry(moduleGraph.getIncomingConnections(m)) +
							initialChunkChunkMap.get(m) +
							entryCountMap.get(m);
						occursInInitialChunksMap.set(m, result);
					}
				}

				for (const m of modules) {
					const result =
						countOccurs(moduleGraph.getIncomingConnections(m)) +
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

				assignAscendingModuleIds(modulesInOccurrenceOrder, compilation);
			});
		});
	}
}

module.exports = OccurrenceModuleIdsPlugin;
