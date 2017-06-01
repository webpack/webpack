/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class OccurrenceOrderPlugin {
	constructor(preferEntry) {
		if(preferEntry !== undefined && typeof preferEntry !== "boolean") {
			throw new Error("Argument should be a boolean.\nFor more info on this plugin, see https://webpack.js.org/plugins/");
		}
		this.preferEntry = preferEntry;
	}
	apply(compiler) {
		const preferEntry = this.preferEntry;
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("optimize-module-order", (modules) => {
				const occursInInitialChunksMap = new Map();
				const occursInAllChunksMap = new Map();

				const initialChunkChunkMap = new Map();
				const entryCountMap = new Map();
				modules.forEach(m => {
					let initial = 0;
					let entry = 0;
					m.forEachChunk(c => {
						if(c.isInitial()) initial++;
						if(c.entryModule === m) entry++;
					});
					initialChunkChunkMap.set(m, initial);
					entryCountMap.set(m, entry);
				});

				const countOccursInEntry = (sum, r) => {
					if(!r.module) return sum;
					return sum + initialChunkChunkMap.get(r.module);
				};
				const countOccurs = (sum, r) => {
					if(!r.module) return sum;
					return sum + r.module.getNumberOfChunks();
				};

				if(preferEntry) {
					modules.forEach(m => {
						const result = m.reasons.reduce(countOccursInEntry, 0) + initialChunkChunkMap.get(m) + entryCountMap.get(m);
						occursInInitialChunksMap.set(m, result);
					});
				}

				modules.forEach(m => {
					const result = m.reasons.reduce(countOccurs, 0) + m.getNumberOfChunks() + entryCountMap.get(m);
					occursInAllChunksMap.set(m, result);
				});

				modules.sort((a, b) => {
					if(preferEntry) {
						const aEntryOccurs = occursInInitialChunksMap.get(a);
						const bEntryOccurs = occursInInitialChunksMap.get(b);
						if(aEntryOccurs > bEntryOccurs) return -1;
						if(aEntryOccurs < bEntryOccurs) return 1;
					}
					const aOccurs = occursInAllChunksMap.get(a);
					const bOccurs = occursInAllChunksMap.get(b);
					if(aOccurs > bOccurs) return -1;
					if(aOccurs < bOccurs) return 1;
					if(a.index > b.index) return 1;
					if(a.index < b.index) return -1;
					return 0;
				});
			});
			compilation.plugin("optimize-chunk-order", (chunks) => {
				const occursInInitialChunksMap = new Map();

				chunks.forEach(c => {
					const result = c.parents.reduce((sum, p) => {
						if(p.isInitial()) return sum + 1;
						return sum;
					}, 0);
					return occursInInitialChunksMap.set(c, result);
				});

				function occurs(c) {
					return c.blocks.length;
				}

				chunks.sort((a, b) => {
					const aEntryOccurs = occursInInitialChunksMap.get(a);
					const bEntryOccurs = occursInInitialChunksMap.get(b);
					if(aEntryOccurs > bEntryOccurs) return -1;
					if(aEntryOccurs < bEntryOccurs) return 1;
					const aOccurs = occurs(a);
					const bOccurs = occurs(b);
					if(aOccurs > bOccurs) return -1;
					if(aOccurs < bOccurs) return 1;
					return a.compareTo(b);
				});
			});
		});
	}
}

module.exports = OccurrenceOrderPlugin;
