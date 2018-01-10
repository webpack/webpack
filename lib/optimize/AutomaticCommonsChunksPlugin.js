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

const getRequests = chunk => {
	return Math.max(
		chunk.mapBlocks(block => block.chunks.length).reduce(Math.max, 0),
		chunk.mapEntrypoints(ep => ep.chunks.length).reduce(Math.max, 0)
	);
};

module.exports = class AutomaticCommonsChunksPlugin {
	constructor(options) {
		this.options = Object.assign({}, {
			initialChunks: false,
			minSize: 30000,
			maxRequests: 4,
			onlyNamed: false,
			name: undefined
		}, options);
	}

	apply(compiler) {
		compiler.hooks.compilation.tap("AutomaticCommonsChunksPlugin", compilation => {
			compilation.hooks.optimizeChunksAdvanced.tap("AutomaticCommonsChunksPlugin", chunks => {
				// Give each selected chunk an index (to create strings from chunks)
				const indexMap = new Map();
				let index = 1;
				for(const chunk of chunks) {
					if(chunk.isInitial() === this.options.initialChunks)
						indexMap.set(chunk, index++);
				}
				// Map a list of chunks to a list of modules
				// For the key the chunk "index" is used, the value is a SortableSet of modules
				const chunksModulesMap = new Map();
				// Map a list of chunks to a name (not every list of chunks is mapped, only when "name" option is used)
				const chunksNameMap = new Map();
				// Walk through all modules
				for(const module of compilation.modules) {
					// Get indices of chunks in which this module occurs
					const chunkIndices = Array.from(module.chunksIterable, chunk => indexMap.get(chunk)).filter(Boolean);
					// Get name from "name" option
					let name = this.options.name;
					if(typeof name === "function")
						name = name(module);
					if(name) {
						chunkIndices.push(`[${name}]`);
					} else if(this.options.onlyNamed) {
						// May skip unnamed chunks if "onlyNamed" is used
						continue;
					}
					// skip for modules which are only in one chunk or don't get a name
					if(chunkIndices.length <= 1) continue;
					// Create key for maps
					const key = chunkIndices.sort().join();
					// Add module to maps
					let modules = chunksModulesMap.get(key);
					if(modules === undefined) {
						chunksModulesMap.set(key, modules = new SortableSet(undefined, sortByIdentifier));
						if(name) {
							// Note name when used
							chunksNameMap.set(key, name);
						}
					}
					modules.add(module);
				}
				// Get size of module lists and sort them by name and size
				const entries = Array.from(chunksModulesMap.entries(), pair => {
					const modules = pair[1];
					const size = Array.from(modules, m => m.size()).reduce((a, b) => a + b, 0);
					return {
						key: pair[0],
						modules,
						size
					};
				}).sort((a, b) => {
					// Sort
					// 1. by chunk name
					const chunkNameA = chunksNameMap.get(a.key);
					const chunkNameB = chunksNameMap.get(b.key);
					if(chunkNameA && !chunkNameB) return -1;
					if(!chunkNameA && chunkNameB) return 1;
					if(chunkNameA && chunkNameB) {
						if(chunkNameA < chunkNameB) return -1;
						if(chunkNameA > chunkNameB) return 1;
					}
					// 2. by total modules size
					const diffSize = b.size - a.size;
					if(diffSize) return diffSize;
					const modulesA = a.modules;
					const modulesB = b.modules;
					// 3. by module identifiers
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
				// Walk though all entries
				for(const item of entries) {
					const chunkName = chunksNameMap.get(item.key);
					// Skip if size is smaller than minimum size
					if(!chunkName && item.size < this.options.minSize) continue;
					// Variable for the new chunk (lazy created)
					let newChunk;
					// Walk through all chunks
					// All modules have the same chunks so we can use the first module
					const firstModule = item.modules.values().next().value;
					for(const chunk of firstModule.chunksIterable) {
						// skip if we address ourself
						if(chunk.name === chunkName) continue;
						// only use selected chunks
						if(!indexMap.get(chunk)) continue;
						// respect max requests when not a named chunk
						if(!chunkName && getRequests(chunk) >= this.options.maxRequests) continue;
						if(newChunk === undefined) {
							// Create the new chunk
							newChunk = compilation.addChunk(chunkName);
						}
						// Add graph connections for splitted chunk
						chunk.split(newChunk);
						// Remove all selected modules from the chunk
						for(const module of item.modules) {
							chunk.removeModule(module);
							module.rewriteChunkInReasons(chunk, [newChunk]);
						}
					}
					// If we successfully creates a new chunk
					if(newChunk) {
						// If the choosen name is already an entry point we remove the entry point
						if(chunkName) {
							const entrypoint = compilation.entrypoints[chunkName];
							if(entrypoint) {
								delete compilation.entrypoints[chunkName];
								entrypoint.remove();
							}
						}
						// Add a note to the chunk
						newChunk.chunkReason = chunkName ? "vendors chunk" : "commons chunk";
						// Add all modules to the new chunk
						for(const module of item.modules) {
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
