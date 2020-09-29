/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/ids/OccurrenceChunkIdsPlugin.json");
const { compareChunksNatural } = require("../util/comparators");
const { assignAscendingChunkIds } = require("./IdHelpers");

/** @typedef {import("../../declarations/plugins/ids/OccurrenceChunkIdsPlugin").OccurrenceChunkIdsPluginOptions} OccurrenceChunkIdsPluginOptions */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class OccurrenceChunkIdsPlugin {
	/**
	 * @param {OccurrenceChunkIdsPluginOptions=} options options object
	 */
	constructor(options = {}) {
		validateOptions(schema, options, {
			name: "Occurrence Order Chunk Ids Plugin",
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
		compiler.hooks.compilation.tap("OccurrenceChunkIdsPlugin", compilation => {
			compilation.hooks.chunkIds.tap("OccurrenceChunkIdsPlugin", chunks => {
				const chunkGraph = compilation.chunkGraph;

				/** @type {Map<Chunk, number>} */
				const occursInInitialChunksMap = new Map();

				const compareNatural = compareChunksNatural(chunkGraph);

				for (const c of chunks) {
					let occurs = 0;
					for (const chunkGroup of c.groupsIterable) {
						for (const parent of chunkGroup.parentsIterable) {
							if (parent.isInitial()) occurs++;
						}
					}
					occursInInitialChunksMap.set(c, occurs);
				}

				const chunksInOccurrenceOrder = Array.from(chunks).sort((a, b) => {
					if (prioritiseInitial) {
						const aEntryOccurs = occursInInitialChunksMap.get(a);
						const bEntryOccurs = occursInInitialChunksMap.get(b);
						if (aEntryOccurs > bEntryOccurs) return -1;
						if (aEntryOccurs < bEntryOccurs) return 1;
					}
					const aOccurs = a.getNumberOfGroups();
					const bOccurs = b.getNumberOfGroups();
					if (aOccurs > bOccurs) return -1;
					if (aOccurs < bOccurs) return 1;
					return compareNatural(a, b);
				});
				assignAscendingChunkIds(chunksInOccurrenceOrder, compilation);
			});
		});
	}
}

module.exports = OccurrenceChunkIdsPlugin;
