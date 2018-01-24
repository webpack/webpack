/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const SortableSet = require("../util/SortableSet");
const GraphHelpers = require("../GraphHelpers");

const sortByIdentifier = (a, b) => {
	if(a.identifier() > b.identifier()) return 1;
	if(a.identifier() < b.identifier()) return -1;
	return 0;
};

const getRequests = chunk => {
	let requests = 0;
	for(const chunkGroup of chunk.groupsIterable) {
		requests = Math.max(requests, chunkGroup.chunks.length);
	}
	return requests;
};

const getModulesSize = modules => {
	let sum = 0;
	for(const m of modules)
		sum += m.size();
	return sum;
};

const isOverlap = (a, b) => {
	for(const item of a) {
		if(b.has(item)) return true;
	}
	return false;
};

const compareEntries = (a, b) => {
	// 1. by priority
	const diffPriority = a.cacheGroup.priority - b.cacheGroup.priority;
	if(diffPriority) return diffPriority;
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
};

module.exports = class SplitChunksPlugin {
	constructor(options) {
		this.options = SplitChunksPlugin.normalizeOptions(options);
	}

	static normalizeOptions(options) {
		return {
			chunks: options.chunks || "all",
			minSize: options.minSize || 0,
			minChunks: options.minChunks || 1,
			maxAsyncRequests: options.maxAsyncRequests || 1,
			maxInitialRequests: options.maxInitialRequests || 1,
			getName: SplitChunksPlugin.normalizeName(options.name) || (() => {}),
			getCacheGroups: SplitChunksPlugin.normalizeCacheGroups(options.cacheGroups),
		};
	}

	static normalizeName(option) {
		if(option === true) {
			const fn = (module, chunks, cacheGroup) => {
				const names = chunks.map(c => c.name);
				if(!names.every(Boolean)) return;
				names.sort();
				const name = (cacheGroup && cacheGroup !== "default" ? cacheGroup + "~" : "") + names.join("~");
				return name;
			};
			return fn;
		}
		if(typeof option === "string") {
			const fn = () => {
				return option;
			};
			return fn;
		}
		if(typeof option === "function")
			return option;
	}

	static normalizeCacheGroups(cacheGroups) {
		if(typeof cacheGroups === "function") {
			return cacheGroups;
		}
		if(cacheGroups && typeof cacheGroups === "object") {
			const fn = (module, chunks) => {
				let results;
				for(const key of Object.keys(cacheGroups)) {
					let option = cacheGroups[key];
					if(option === false)
						continue;
					if(option instanceof RegExp || typeof option === "string") {
						option = {
							test: option
						};
					}
					if(typeof option === "function") {
						let result = option(module);
						if(result) {
							if(results === undefined) results = [];
							for(const r of (Array.isArray(result) ? result : [result])) {
								const result = Object.assign({
									key,
								}, r);
								if(result.name) result.getName = () => result.name;
								results.push(result);
							}
						}
					} else if(SplitChunksPlugin.checkTest(option.test, module, chunks)) {
						if(results === undefined) results = [];
						results.push({
							key: key,
							priority: option.priority,
							getName: SplitChunksPlugin.normalizeName(option.name),
							chunks: option.chunks,
							enforce: option.enforce,
							minSize: option.minSize,
							minChunks: option.minChunks,
							maxAsyncRequests: option.maxAsyncRequests,
							maxInitialRequests: option.maxInitialRequests,
							reuseExistingChunk: option.reuseExistingChunk
						});
					}
				}
				return results;
			};
			return fn;
		}
		const fn = () => {};
		return fn;
	}

	static checkTest(test, module, chunks) {
		if(test === undefined)
			return true;
		if(typeof test === "function")
			return test(module, chunks);
		if(typeof test === "boolean")
			return test;
		const names = chunks.map(c => c.name).concat(module.nameForCondition ? [module.nameForCondition()] : []).filter(Boolean);
		if(typeof test === "string") {
			for(const name of names)
				if(name.startsWith(test))
					return true;
			return false;
		}
		if(test instanceof RegExp) {
			for(const name of names)
				if(test.test(name))
					return true;
			return false;
		}
		return false;
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap("SplitChunksPlugin", compilation => {
			let alreadyOptimized = false;
			compilation.hooks.unseal.tap("SplitChunksPlugin", () => {
				alreadyOptimized = false;
			});
			compilation.hooks.optimizeChunksAdvanced.tap("SplitChunksPlugin", chunks => {
				if(alreadyOptimized) return;
				alreadyOptimized = true;
				// Give each selected chunk an index (to create strings from chunks)
				const indexMap = new Map();
				let index = 1;
				for(const chunk of chunks) {
					indexMap.set(chunk, index++);
				}
				// Map a list of chunks to a list of modules
				// For the key the chunk "index" is used, the value is a SortableSet of modules
				const chunksInfoMap = new Map();
				// Walk through all modules
				for(const module of compilation.modules) {
					// Get array of chunks
					const chunks = module.getChunks();
					// Get cache group
					let cacheGroups = this.options.getCacheGroups(module, chunks);
					if(!Array.isArray(cacheGroups)) continue;
					for(const cacheGroupSource of cacheGroups) {
						const cacheGroup = {
							key: cacheGroupSource.key,
							priority: cacheGroupSource.priority || 0,
							chunks: cacheGroupSource.chunks || this.options.chunks,
							minSize: cacheGroupSource.minSize !== undefined ? cacheGroupSource.minSize : cacheGroupSource.enforce ? 0 : this.options.minSize,
							minChunks: cacheGroupSource.minChunks !== undefined ? cacheGroupSource.minChunks : cacheGroupSource.enforce ? 1 : this.options.minChunks,
							maxAsyncRequests: cacheGroupSource.maxAsyncRequests !== undefined ? cacheGroupSource.maxAsyncRequests : cacheGroupSource.enforce ? Infinity : this.options.maxAsyncRequests,
							maxInitialRequests: cacheGroupSource.maxInitialRequests !== undefined ? cacheGroupSource.maxInitialRequests : cacheGroupSource.enforce ? Infinity : this.options.maxInitialRequests,
							getName: cacheGroupSource.getName !== undefined ? cacheGroupSource.getName : this.options.getName,
							reuseExistingChunk: cacheGroupSource.reuseExistingChunk
						};
						// Select chunks by configuration
						const selectedChunks = cacheGroup.chunks === "initial" ? chunks.filter(chunk => chunk.canBeInitial()) :
							cacheGroup.chunks === "async" ? chunks.filter(chunk => !chunk.canBeInitial()) :
							chunks;
						// Get indices of chunks in which this module occurs
						const chunkIndices = selectedChunks.map(chunk => indexMap.get(chunk));
						// Break if minimum number of chunks is not reached
						if(chunkIndices.length < cacheGroup.minChunks)
							continue;
						// Determine name for split chunk
						const name = cacheGroup.getName(module, selectedChunks, cacheGroup.key);
						// Create key for maps
						// When it has a name we use the name as key
						// Elsewise we create the key from chunks and cache group key
						// This automatically merges equal names
						const chunksKey = chunkIndices.sort().join();
						const key = name && `name:${name}` ||
							`chunks:${chunksKey} key:${cacheGroup.key}`;
						// Add module to maps
						let info = chunksInfoMap.get(key);
						if(info === undefined) {
							chunksInfoMap.set(key, info = {
								modules: new SortableSet(undefined, sortByIdentifier),
								cacheGroup,
								name,
								chunks: new Map(),
								reusedableChunks: new Set(),
								chunksKeys: new Set()
							});
						}
						info.modules.add(module);
						if(!info.chunksKeys.has(chunksKey)) {
							info.chunksKeys.add(chunksKey);
							for(const chunk of selectedChunks) {
								info.chunks.set(chunk, chunk.getNumberOfModules());
							}
						}
					}
				}
				for(const info of chunksInfoMap.values()) {
					// Get size of module lists
					info.size = getModulesSize(info.modules);
				}
				let changed = false;
				while(chunksInfoMap.size > 0) {
					// Find best matching entry
					let bestEntryKey;
					let bestEntry;
					for(const pair of chunksInfoMap) {
						const key = pair[0];
						const info = pair[1];
						if(bestEntry === undefined) {
							bestEntry = info;
							bestEntryKey = key;
						} else if(compareEntries(bestEntry, info) < 0) {
							bestEntry = info;
							bestEntryKey = key;
						}
					}

					const item = bestEntry;
					if(item.size < item.cacheGroup.minSize) {
						chunksInfoMap.delete(bestEntryKey);
						continue;
					}

					let chunkName = item.name;
					// Variable for the new chunk (lazy created)
					let newChunk;
					// When no chunk name, check if we can reuse a chunk instead of creating a new one
					let isReused = false;
					if(item.cacheGroup.reuseExistingChunk) {
						for(const pair of item.chunks) {
							if(pair[1] === item.modules.size) {
								const chunk = pair[0];
								if(chunk.hasEntryModule()) continue;
								if(!newChunk || !newChunk.name)
									newChunk = chunk;
								else if(chunk.name && chunk.name.length < newChunk.name.length)
									newChunk = chunk;
								else if(chunk.name && chunk.name.length === newChunk.name.length && chunk.name < newChunk.name)
									newChunk = chunk;
								chunkName = undefined;
								isReused = true;
							}
						}
					}
					// Walk through all chunks
					for(const chunk of item.chunks.keys()) {
						// skip if we address ourself
						if(chunk.name === chunkName || chunk === newChunk) continue;
						// respect max requests when not enforced
						const maxRequests = chunk.isOnlyInitial() ? item.cacheGroup.maxInitialRequests :
							chunk.canBeInitial() ? Math.min(item.cacheGroup.maxInitialRequests, item.cacheGroup.maxAsyncRequests) :
							item.cacheGroup.maxAsyncRequests;
						if(isFinite(maxRequests) && getRequests(chunk) >= maxRequests) continue;
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
					// If we successfully created a new chunk or reused one
					if(newChunk) {
						// Add a note to the chunk
						newChunk.chunkReason = isReused ? "reused as split chunk" : "split chunk";
						if(item.cacheGroup.key) {
							newChunk.chunkReason += ` (cache group: ${item.cacheGroup.key})`;
						}
						if(chunkName) {
							newChunk.chunkReason += ` (name: ${chunkName})`;
							// If the choosen name is already an entry point we remove the entry point
							const entrypoint = compilation.entrypoints.get(chunkName);
							if(entrypoint) {
								compilation.entrypoints.delete(chunkName);
								entrypoint.remove();
								newChunk.entryModule = undefined;
							}
						}
						if(!isReused) {
							// Add all modules to the new chunk
							for(const module of item.modules) {
								GraphHelpers.connectChunkAndModule(newChunk, module);
							}
						}
						// remove all modules from other entries and update size
						for(const info of chunksInfoMap.values()) {
							if(isOverlap(info.chunks, item.chunks)) {
								const oldSize = info.modules.size;
								for(const module of item.modules) {
									info.modules.delete(module);
								}
								if(info.modules.size !== oldSize) {
									info.size = getModulesSize(info.modules);
								}
							}
						}
						changed = true;
					}

					chunksInfoMap.delete(bestEntryKey);
				}
				if(changed) return true;
			});
		});
	}
};
