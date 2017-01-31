/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class OccurrenceOrderPlugin {
	constructor(preferEntry) {
		if(preferEntry !== undefined && typeof preferEntry !== "boolean") {
			throw new Error("Argument should be a boolean.\nFor more info on this plugin, see https://webpack.github.io/docs/list-of-plugins.html");
		}
		this.preferEntry = preferEntry;
	}
	apply(compiler) {
		const preferEntry = this.preferEntry;
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("optimize-module-order", (modules) => {
				function entryChunks(m) {
					var result = 0;
					var chunks = m.chunks;
					for(var index = 0; index < chunks.length; index++) {
						var chunk = chunks[index];
						result = result + (chunk.isInitial() ? 1 : 0) + (chunk.entryModule === m ? 1 : 0);
					}

					return result;
				}

				function occursInEntry(m) {
					if(typeof m.__OccurenceOrderPlugin_occursInEntry === "number") return m.__OccurenceOrderPlugin_occursInEntry;
					var result = 0;
					var reasons = m.reasons;
					for(var index = 0; index < reasons.length; index++) {
						var reasonModule = reasons[index].module;
						if(!reasonModule) continue;
						result = result + entryChunks(reasonModule);
					}

					return m.__OccurenceOrderPlugin_occursInEntry = result + entryChunks(m);
				}

				function occurs(m) {
					if(typeof m.__OccurenceOrderPlugin_occurs === "number") return m.__OccurenceOrderPlugin_occurs;
					var result = 0;
					var reasons = m.reasons;
					for(var index = 0; index < reasons.length; index++) {
						var reasonModule = reasons[index].module;
						if(!reasonModule) continue;
						result = result + reasonModule.chunks.length;
					}

					return m.__OccurenceOrderPlugin_occurs = result + m.chunks.length + m.chunks.filter((c) => {
						return c.entryModule === m;
					}).length;
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
				for(var indexModule = 0; indexModule < modules.length; indexModule++) {
					var module = modules[indexModule];

					module.__OccurenceOrderPlugin_occursInEntry = undefined;
					module.__OccurenceOrderPlugin_occurs = undefined;
				}
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
				chunks.forEach((c) => {
					c.modules.sort((a, b) => {
						if(a.identifier() > b.identifier()) return 1;
						if(a.identifier() < b.identifier()) return -1;
						return 0;
					});
				});
				chunks.sort((a, b) => {
					const aEntryOccurs = occursInEntry(a);
					const bEntryOccurs = occursInEntry(b);
					if(aEntryOccurs > bEntryOccurs) return -1;
					if(aEntryOccurs < bEntryOccurs) return 1;
					const aOccurs = occurs(a);
					const bOccurs = occurs(b);
					if(aOccurs > bOccurs) return -1;
					if(aOccurs < bOccurs) return 1;
					if(a.modules.length > b.modules.length) return -1;
					if(a.modules.length < b.modules.length) return 1;
					for(let i = 0; i < a.modules.length; i++) {
						if(a.modules[i].identifier() > b.modules[i].identifier()) return -1;
						if(a.modules[i].identifier() < b.modules[i].identifier()) return 1;
					}
					return 0;
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
