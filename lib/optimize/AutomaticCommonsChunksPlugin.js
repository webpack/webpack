/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const SortableSet = require("../util/SortableSet");

const sortByIdentifier = (a, b) => {
	if(a.identifier() > b.identifier()) return 1;
	if(a.identifier() < b.identifier()) return -1;
	return 0;
};

module.exports = class AutomaticCommonsChunksPlugin {
	constructor(options) {
		this.options = Object.assign({}, {
			initialChunks: false,
			onlyNamed: false,
			name: undefined
		}, options);
	}

	apply(compiler) {
		compiler.hooks.compilation.tap("AutomaticCommonsChunksPlugin", compilation => {
			compilation.hooks.optimizeChunksAdvanced.tap("AutomaticCommonsChunksPlugin", chunks => {
				const indexMap = new Map();
				let index = 1;
				for(const chunk of chunks) {
					if(chunk.isInitial() === this.options.initialChunks)
						indexMap.set(chunk, index++);
				}
				const chunksModulesMap = new Map();
				const chunksNameMap = new Map();
				for(const module of compilation.modules) {
					const chunkIndices = Array.from(module.chunksIterable, chunk => indexMap.get(chunk)).filter(Boolean);
					let name = this.options.name;
					if(typeof name === "function")
						name = name(module);
					if(name) {
						chunkIndices.push(name);
					} else if(this.options.onlyNamed) {
						continue;
					}
					if(chunkIndices.length <= 1) continue;
					const key = chunkIndices.sort().join();
					let modules = chunksModulesMap.get(key);
					if(modules === undefined) {
						chunksModulesMap.set(key, modules = new SortableSet(undefined, sortByIdentifier));
						if(name) {
							chunksNameMap.set(key, name);
						}
					}
					modules.add(module);
				}
				const entries = Array.from(chunksModulesMap.entries()).sort((a, b) => {
					const chunkNameA = chunksNameMap.get(a[0]);
					const chunkNameB = chunksNameMap.get(b[0]);
					if(chunkNameA && !chunkNameB) return -1;
					if(!chunkNameA && chunkNameB) return 1;
					if(chunkNameA && chunkNameB) {
						if(chunkNameA < chunkNameB) return -1;
						if(chunkNameA > chunkNameB) return 1;
					}
					const modulesA = a[1];
					const modulesB = b[1];
					const diff = modulesA.size - modulesB.size;
					if(diff) return diff;
					modulesA.sort();
					modulesB.sort();
					const aI = modulesA[Symbol.iterator]();
					const bI = modulesB[Symbol.iterator]();
					while(true) { // eslint-disable-line
						const aItem = aI.next();
						const bItem = bI.next();
						if(aItem.done) return 0;
						const aModuleIdentifier = aItem.value.identifier();
						const bModuleIdentifier = bItem.value.identifier();
						if(aModuleIdentifier > bModuleIdentifier) return -1;
						if(aModuleIdentifier < bModuleIdentifier) return 1;
					}
				});
				let changed = false;
				for(const [key, modules] of entries) {
					const chunkName = chunksNameMap.get(key);
					const newChunk = compilation.addChunk(chunkName);
					let splitted = false;
					const firstModule = modules.values().next().value;
					for(const chunk of firstModule.chunksIterable) {
						if(newChunk === chunk) continue;
						if(!indexMap.get(chunk)) continue;
						splitted = true;
						chunk.split(newChunk);
						for(const module of modules) {
							chunk.removeModule(module);
							module.rewriteChunkInReasons(chunk, [newChunk]);
						}
					}
					if(splitted) {
						if(chunkName) {
							const entrypoint = compilation.entrypoints[chunkName];
							if(entrypoint) {
								delete compilation.entrypoints[chunkName];
								entrypoint.remove();
							}
						}
						newChunk.chunkReason = chunkName ? "vendors chunk" : "commons chunk";
						for(const module of modules) {
							newChunk.addModule(module);
							module.addChunk(newChunk);
						}
						changed = true;
					}
				}
				if(changed) return true;
			});
		});
	}
};
