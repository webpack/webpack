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
				function entryChunks(m) {
					let total = 0;
					m.forEachChunk(c => {
						const sum = (c.isInitial() ? 1 : 0) + (c.entryModule === m ? 1 : 0);
						total += sum;
					});
					return total;
				}

				function occursInEntry(m) {
					if(typeof m.__OccurenceOrderPlugin_occursInEntry === "number") return m.__OccurenceOrderPlugin_occursInEntry;
					const result = m.reasons.map((r) => {
						if(!r.module) return 0;
						return entryChunks(r.module);
					}).reduce((a, b) => {
						return a + b;
					}, 0) + entryChunks(m);
					return m.__OccurenceOrderPlugin_occursInEntry = result;
				}

				function occurs(m) {
					if(typeof m.__OccurenceOrderPlugin_occurs === "number") return m.__OccurenceOrderPlugin_occurs;
					let numberEntry = 0;
					m.forEachChunk(c => {
						if(c.entryModule === m)
							numberEntry++;
					});
					const result = m.reasons.map((r) => {
						if(!r.module) return 0;
						return r.module.getNumberOfChunks();
					}).reduce((a, b) => {
						return a + b;
					}, 0) + m.getNumberOfChunks() + numberEntry;
					return m.__OccurenceOrderPlugin_occurs = result;
				}
				modules.sort((a, b) => {
					if(preferEntry) {
						const aEntryOccurs = occursInEntry(a);
						const bEntryOccurs = occursInEntry(b);
						if(aEntryOccurs > bEntryOccurs) return -1;
						if(aEntryOccurs < bEntryOccurs) return 1;
					}
					const aOccurs = occurs(a);
					const bOccurs = occurs(b);
					if(aOccurs > bOccurs) return -1;
					if(aOccurs < bOccurs) return 1;
					if(a.identifier() > b.identifier()) return 1;
					if(a.identifier() < b.identifier()) return -1;
					return 0;
				});
				// TODO refactor to Map
				modules.forEach((m) => {
					m.__OccurenceOrderPlugin_occursInEntry = undefined;
					m.__OccurenceOrderPlugin_occurs = undefined;
				});
			});
			compilation.plugin("optimize-chunk-order", (chunks) => {
				function occursInEntry(c) {
					if(typeof c.__OccurenceOrderPlugin_occursInEntry === "number") return c.__OccurenceOrderPlugin_occursInEntry;
					const result = c.parents.filter((p) => {
						return p.isInitial();
					}).length;
					return c.__OccurenceOrderPlugin_occursInEntry = result;
				}

				function occurs(c) {
					return c.blocks.length;
				}
				chunks.sort((a, b) => {
					const aEntryOccurs = occursInEntry(a);
					const bEntryOccurs = occursInEntry(b);
					if(aEntryOccurs > bEntryOccurs) return -1;
					if(aEntryOccurs < bEntryOccurs) return 1;
					const aOccurs = occurs(a);
					const bOccurs = occurs(b);
					if(aOccurs > bOccurs) return -1;
					if(aOccurs < bOccurs) return 1;
					return a.compareTo(b);
				});
				// TODO refactor to Map
				chunks.forEach((c) => {
					c.__OccurenceOrderPlugin_occursInEntry = undefined;
				});
			});
		});
	}
}

module.exports = OccurrenceOrderPlugin;
