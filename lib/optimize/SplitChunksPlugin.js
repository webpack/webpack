/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const crypto = require("crypto");
const SortableSet = require("../util/SortableSet");
const GraphHelpers = require("../GraphHelpers");
const { isSubset } = require("../util/SetHelpers");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Module")} Module */

const hashFilename = name => {
	return crypto
		.createHash("md4")
		.update(name)
		.digest("hex")
		.slice(0, 8);
};

const sortByIdentifier = (a, b) => {
	if (a.identifier() > b.identifier()) return 1;
	if (a.identifier() < b.identifier()) return -1;
	return 0;
};

const getRequests = chunk => {
	let requests = 0;
	for (const chunkGroup of chunk.groupsIterable) {
		requests = Math.max(requests, chunkGroup.chunks.length);
	}
	return requests;
};

const getModulesSize = modules => {
	let sum = 0;
	for (const m of modules) {
		sum += m.size();
	}
	return sum;
};

const isOverlap = (a, b) => {
	for (const item of a.keys()) {
		if (b.has(item)) return true;
	}
	return false;
};

const compareEntries = (a, b) => {
	// 1. by priority
	const diffPriority = a.cacheGroup.priority - b.cacheGroup.priority;
	if (diffPriority) return diffPriority;
	// 2. by number of chunks
	const diffCount = a.chunks.size - b.chunks.size;
	if (diffCount) return diffCount;
	// 3. by size reduction
	const aSizeReduce = a.size * (a.chunks.size - 1);
	const bSizeReduce = b.size * (b.chunks.size - 1);
	const diffSizeReduce = aSizeReduce - bSizeReduce;
	if (diffSizeReduce) return diffSizeReduce;
	// 4. by number of modules (to be able to compare by identifier)
	const modulesA = a.modules;
	const modulesB = b.modules;
	const diff = modulesA.size - modulesB.size;
	if (diff) return diff;
	// 5. by module identifiers
	modulesA.sort();
	modulesB.sort();
	const aI = modulesA[Symbol.iterator]();
	const bI = modulesB[Symbol.iterator]();
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const aItem = aI.next();
		const bItem = bI.next();
		if (aItem.done) return 0;
		const aModuleIdentifier = aItem.value.identifier();
		const bModuleIdentifier = bItem.value.identifier();
		if (aModuleIdentifier > bModuleIdentifier) return -1;
		if (aModuleIdentifier < bModuleIdentifier) return 1;
	}
};

const INITIAL_CHUNK_FILTER = chunk => chunk.canBeInitial();
const ASYNC_CHUNK_FILTER = chunk => !chunk.canBeInitial();
const ALL_CHUNK_FILTER = chunk => true;

module.exports = class SplitChunksPlugin {
	constructor(options) {
		this.options = SplitChunksPlugin.normalizeOptions(options);
	}

	static normalizeOptions(options = {}) {
		return {
			chunksFilter: SplitChunksPlugin.normalizeChunksFilter(
				options.chunks || "all"
			),
			minSize: options.minSize || 0,
			minChunks: options.minChunks || 1,
			maxAsyncRequests: options.maxAsyncRequests || 1,
			maxInitialRequests: options.maxInitialRequests || 1,
			getName:
				SplitChunksPlugin.normalizeName({
					name: options.name,
					automaticNameDelimiter: options.automaticNameDelimiter
				}) || (() => {}),
			filename: options.filename || undefined,
			getCacheGroups: SplitChunksPlugin.normalizeCacheGroups({
				cacheGroups: options.cacheGroups,
				automaticNameDelimiter: options.automaticNameDelimiter
			})
		};
	}

	static normalizeName({ name, automaticNameDelimiter }) {
		if (name === true) {
			const cache = new Map();
			const fn = (module, chunks, cacheGroup) => {
				let cacheEntry = cache.get(chunks);
				if (cacheEntry === undefined) {
					cacheEntry = {};
					cache.set(chunks, cacheEntry);
				} else if (cacheGroup in cacheEntry) {
					return cacheEntry[cacheGroup];
				}
				const names = chunks.map(c => c.name);
				if (!names.every(Boolean)) {
					cacheEntry[cacheGroup] = undefined;
					return;
				}
				names.sort();
				let name =
					(cacheGroup && cacheGroup !== "default"
						? cacheGroup + automaticNameDelimiter
						: "") + names.join(automaticNameDelimiter);
				// Filenames and paths can't be too long otherwise an
				// ENAMETOOLONG error is raised. If the generated name if too
				// long, it is truncated and a hash is appended. The limit has
				// been set to 100 to prevent `[name].[chunkhash].[ext]` from
				// generating a 256+ character string.
				if (name.length > 100) {
					name =
						name.slice(0, 100) + automaticNameDelimiter + hashFilename(name);
				}
				cacheEntry[cacheGroup] = name;
				return name;
			};
			return fn;
		}
		if (typeof name === "string") {
			const fn = () => {
				return name;
			};
			return fn;
		}
		if (typeof name === "function") return name;
	}

	static normalizeChunksFilter(chunks) {
		if (chunks === "initial") {
			return INITIAL_CHUNK_FILTER;
		}
		if (chunks === "async") {
			return ASYNC_CHUNK_FILTER;
		}
		if (chunks === "all") {
			return ALL_CHUNK_FILTER;
		}
		if (typeof chunks === "function") return chunks;
	}

	static normalizeCacheGroups({ cacheGroups, automaticNameDelimiter }) {
		if (typeof cacheGroups === "function") {
			// TODO webpack 5 remove this
			if (cacheGroups.length !== 1) {
				return module => cacheGroups(module, module.getChunks());
			}
			return cacheGroups;
		}
		if (cacheGroups && typeof cacheGroups === "object") {
			const fn = module => {
				let results;
				for (const key of Object.keys(cacheGroups)) {
					let option = cacheGroups[key];
					if (option === false) continue;
					if (option instanceof RegExp || typeof option === "string") {
						option = {
							test: option
						};
					}
					if (typeof option === "function") {
						let result = option(module);
						if (result) {
							if (results === undefined) results = [];
							for (const r of Array.isArray(result) ? result : [result]) {
								const result = Object.assign({ key }, r);
								if (result.name) result.getName = () => result.name;
								if (result.chunks) {
									result.chunksFilter = SplitChunksPlugin.normalizeChunksFilter(
										result.chunks
									);
								}
								results.push(result);
							}
						}
					} else if (SplitChunksPlugin.checkTest(option.test, module)) {
						if (results === undefined) results = [];
						results.push({
							key: key,
							priority: option.priority,
							getName: SplitChunksPlugin.normalizeName({
								name: option.name,
								automaticNameDelimiter
							}),
							chunksFilter: SplitChunksPlugin.normalizeChunksFilter(
								option.chunks
							),
							enforce: option.enforce,
							minSize: option.minSize,
							minChunks: option.minChunks,
							maxAsyncRequests: option.maxAsyncRequests,
							maxInitialRequests: option.maxInitialRequests,
							filename: option.filename,
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

	static checkTest(test, module) {
		if (test === undefined) return true;
		if (typeof test === "function") {
			if (test.length !== 1) {
				return test(module, module.getChunks());
			}
			return test(module);
		}
		if (typeof test === "boolean") return test;
		if (typeof test === "string") {
			if (
				module.nameForCondition &&
				module.nameForCondition().startsWith(test)
			) {
				return true;
			}
			for (const chunk of module.chunksIterable) {
				if (chunk.name && chunk.name.startsWith(test)) {
					return true;
				}
			}
			return false;
		}
		if (test instanceof RegExp) {
			if (module.nameForCondition && test.test(module.nameForCondition())) {
				return true;
			}
			for (const chunk of module.chunksIterable) {
				if (chunk.name && test.test(chunk.name)) {
					return true;
				}
			}
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
			compilation.hooks.optimizeChunksAdvanced.tap(
				"SplitChunksPlugin",
				chunks => {
					if (alreadyOptimized) return;
					alreadyOptimized = true;
					// Give each selected chunk an index (to create strings from chunks)
					const indexMap = new Map();
					let index = 1;
					for (const chunk of chunks) {
						indexMap.set(chunk, index++);
					}
					const getKey = chunks => {
						return Array.from(chunks, c => indexMap.get(c))
							.sort()
							.join();
					};
					/** @type {Map<string, Set<Chunk>>} */
					const chunkSetsInGraph = new Map();
					for (const module of compilation.modules) {
						const chunksKey = getKey(module.chunksIterable);
						if (!chunkSetsInGraph.has(chunksKey)) {
							chunkSetsInGraph.set(chunksKey, new Set(module.chunksIterable));
						}
					}

					// group these set of chunks by count
					// to allow to check less sets via isSubset
					// (only smaller sets can be subset)
					/** @type {Map<number, Array<Set<Chunk>>>} */
					const chunkSetsByCount = new Map();
					for (const chunksSet of chunkSetsInGraph.values()) {
						const count = chunksSet.size;
						let array = chunkSetsByCount.get(count);
						if (array === undefined) {
							array = [];
							chunkSetsByCount.set(count, array);
						}
						array.push(chunksSet);
					}

					// Create a list of possible combinations
					const combinationsCache = new Map(); // Map<string, Set<Chunk>[]>

					const getCombinations = key => {
						const chunksSet = chunkSetsInGraph.get(key);
						var array = [chunksSet];
						if (chunksSet.size > 1) {
							for (const [count, setArray] of chunkSetsByCount) {
								// "equal" is not needed because they would have been merge in the first step
								if (count < chunksSet.size) {
									for (const set of setArray) {
										if (isSubset(chunksSet, set)) {
											array.push(set);
										}
									}
								}
							}
						}
						return array;
					};

					/**
					 * @typedef {Object} SelectedChunksResult
					 * @property {Chunk[]} chunks the list of chunks
					 * @property {string} key a key of the list
					 */

					/**
					 * @typedef {function(Chunk): boolean} ChunkFilterFunction
					 */

					/** @type {WeakMap<Set<Chunk>, WeakMap<ChunkFilterFunction, SelectedChunksResult>>} */
					const selectedChunksCacheByChunksSet = new WeakMap();

					/**
					 * get list and key by applying the filter function to the list
					 * It is cached for performance reasons
					 * @param {Set<Chunk>} chunks list of chunks
					 * @param {ChunkFilterFunction} chunkFilter filter function for chunks
					 * @returns {SelectedChunksResult} list and key
					 */
					const getSelectedChunks = (chunks, chunkFilter) => {
						let entry = selectedChunksCacheByChunksSet.get(chunks);
						if (entry === undefined) {
							entry = new WeakMap();
							selectedChunksCacheByChunksSet.set(chunks, entry);
						}
						/** @type {SelectedChunksResult} */
						let entry2 = entry.get(chunkFilter);
						if (entry2 === undefined) {
							/** @type {Chunk[]} */
							const selectedChunks = [];
							for (const chunk of chunks) {
								if (chunkFilter(chunk)) selectedChunks.push(chunk);
							}
							entry2 = {
								chunks: selectedChunks,
								key: getKey(selectedChunks)
							};
							entry.set(chunkFilter, entry2);
						}
						return entry2;
					};

					/**
					 * @typedef {Object} ChunksInfoItem
					 * @property {SortableSet} modules
					 * @property {TODO} cacheGroup
					 * @property {string} name
					 * @property {number} size
					 * @property {Map<Chunk, number>} chunks
					 * @property {Set<Chunk>} reuseableChunks
					 * @property {Set<string>} chunksKeys
					 */

					// Map a list of chunks to a list of modules
					// For the key the chunk "index" is used, the value is a SortableSet of modules
					/** @type {Map<string, ChunksInfoItem>} */
					const chunksInfoMap = new Map();

					/**
					 * @param {TODO} cacheGroup the current cache group
					 * @param {Chunk[]} selectedChunks chunks selected for this module
					 * @param {string} selectedChunksKey a key of selectedChunks
					 * @param {Module} module the current module
					 * @returns {void}
					 */
					const addModuleToChunksInfoMap = (
						cacheGroup,
						selectedChunks,
						selectedChunksKey,
						module
					) => {
						// Break if minimum number of chunks is not reached
						if (selectedChunks.length < cacheGroup.minChunks) return;
						// Determine name for split chunk
						const name = cacheGroup.getName(
							module,
							selectedChunks,
							cacheGroup.key
						);
						// Create key for maps
						// When it has a name we use the name as key
						// Elsewise we create the key from chunks and cache group key
						// This automatically merges equal names
						const key =
							(name && `name:${name}`) ||
							`chunks:${selectedChunksKey} key:${cacheGroup.key}`;
						// Add module to maps
						let info = chunksInfoMap.get(key);
						if (info === undefined) {
							chunksInfoMap.set(
								key,
								(info = {
									modules: new SortableSet(undefined, sortByIdentifier),
									cacheGroup,
									name,
									size: 0,
									chunks: new Map(),
									reuseableChunks: new Set(),
									chunksKeys: new Set()
								})
							);
						}
						info.modules.add(module);
						info.size += module.size();
						if (!info.chunksKeys.has(selectedChunksKey)) {
							info.chunksKeys.add(selectedChunksKey);
							for (const chunk of selectedChunks) {
								info.chunks.set(chunk, chunk.getNumberOfModules());
							}
						}
					};

					// Walk through all modules
					for (const module of compilation.modules) {
						// Get cache group
						let cacheGroups = this.options.getCacheGroups(module);
						if (!Array.isArray(cacheGroups) || cacheGroups.length === 0) {
							continue;
						}

						// Prepare some values
						const chunksKey = getKey(module.chunksIterable);
						let combs = combinationsCache.get(chunksKey);
						if (combs === undefined) {
							combs = getCombinations(chunksKey);
							combinationsCache.set(chunksKey, combs);
						}

						for (const cacheGroupSource of cacheGroups) {
							const cacheGroup = {
								key: cacheGroupSource.key,
								priority: cacheGroupSource.priority || 0,
								chunksFilter:
									cacheGroupSource.chunksFilter || this.options.chunksFilter,
								minSize:
									cacheGroupSource.minSize !== undefined
										? cacheGroupSource.minSize
										: cacheGroupSource.enforce
											? 0
											: this.options.minSize,
								minChunks:
									cacheGroupSource.minChunks !== undefined
										? cacheGroupSource.minChunks
										: cacheGroupSource.enforce
											? 1
											: this.options.minChunks,
								maxAsyncRequests:
									cacheGroupSource.maxAsyncRequests !== undefined
										? cacheGroupSource.maxAsyncRequests
										: cacheGroupSource.enforce
											? Infinity
											: this.options.maxAsyncRequests,
								maxInitialRequests:
									cacheGroupSource.maxInitialRequests !== undefined
										? cacheGroupSource.maxInitialRequests
										: cacheGroupSource.enforce
											? Infinity
											: this.options.maxInitialRequests,
								getName:
									cacheGroupSource.getName !== undefined
										? cacheGroupSource.getName
										: this.options.getName,
								filename:
									cacheGroupSource.filename !== undefined
										? cacheGroupSource.filename
										: this.options.filename,
								reuseExistingChunk: cacheGroupSource.reuseExistingChunk
							};
							// For all combination of chunk selection
							for (const chunkCombination of combs) {
								// Break if minimum number of chunks is not reached
								if (chunkCombination.size < cacheGroup.minChunks) continue;
								// Select chunks by configuration
								const {
									chunks: selectedChunks,
									key: selectedChunksKey
								} = getSelectedChunks(
									chunkCombination,
									cacheGroup.chunksFilter
								);

								addModuleToChunksInfoMap(
									cacheGroup,
									selectedChunks,
									selectedChunksKey,
									module
								);
							}
						}
					}

					while (chunksInfoMap.size > 0) {
						// Find best matching entry
						let bestEntryKey;
						let bestEntry;
						for (const pair of chunksInfoMap) {
							const key = pair[0];
							const info = pair[1];
							if (info.size >= info.cacheGroup.minSize) {
								if (bestEntry === undefined) {
									bestEntry = info;
									bestEntryKey = key;
								} else if (compareEntries(bestEntry, info) < 0) {
									bestEntry = info;
									bestEntryKey = key;
								}
							}
						}

						// No suitable item left
						if (bestEntry === undefined) break;

						const item = bestEntry;
						chunksInfoMap.delete(bestEntryKey);

						let chunkName = item.name;
						// Variable for the new chunk (lazy created)
						let newChunk;
						// When no chunk name, check if we can reuse a chunk instead of creating a new one
						let isReused = false;
						if (item.cacheGroup.reuseExistingChunk) {
							for (const pair of item.chunks) {
								if (pair[1] === item.modules.size) {
									const chunk = pair[0];
									if (chunk.hasEntryModule()) continue;
									if (!newChunk || !newChunk.name) {
										newChunk = chunk;
									} else if (
										chunk.name &&
										chunk.name.length < newChunk.name.length
									) {
										newChunk = chunk;
									} else if (
										chunk.name &&
										chunk.name.length === newChunk.name.length &&
										chunk.name < newChunk.name
									) {
										newChunk = chunk;
									}
									chunkName = undefined;
									isReused = true;
								}
							}
						}
						// Check if maxRequests condition can be fullfilled

						const usedChunks = Array.from(item.chunks.keys()).filter(chunk => {
							// skip if we address ourself
							return (
								(!chunkName || chunk.name !== chunkName) && chunk !== newChunk
							);
						});

						// Skip when no chunk selected
						if (usedChunks.length === 0) continue;

						const chunkInLimit = usedChunks.filter(chunk => {
							// respect max requests when not enforced
							const maxRequests = chunk.isOnlyInitial()
								? item.cacheGroup.maxInitialRequests
								: chunk.canBeInitial()
									? Math.min(
											item.cacheGroup.maxInitialRequests,
											item.cacheGroup.maxAsyncRequests
									  )
									: item.cacheGroup.maxAsyncRequests;
							return !isFinite(maxRequests) || getRequests(chunk) < maxRequests;
						});

						if (chunkInLimit.length < usedChunks.length) {
							for (const module of item.modules) {
								addModuleToChunksInfoMap(
									item.cacheGroup,
									chunkInLimit,
									getKey(chunkInLimit),
									module
								);
							}
							continue;
						}

						// Create the new chunk if not reusing one
						if (!isReused) {
							newChunk = compilation.addChunk(chunkName);
						}
						// Walk through all chunks
						for (const chunk of usedChunks) {
							// Add graph connections for splitted chunk
							chunk.split(newChunk);
						}

						// Add a note to the chunk
						newChunk.chunkReason = isReused
							? "reused as split chunk"
							: "split chunk";
						if (item.cacheGroup.key) {
							newChunk.chunkReason += ` (cache group: ${item.cacheGroup.key})`;
						}
						if (chunkName) {
							newChunk.chunkReason += ` (name: ${chunkName})`;
							// If the chosen name is already an entry point we remove the entry point
							const entrypoint = compilation.entrypoints.get(chunkName);
							if (entrypoint) {
								compilation.entrypoints.delete(chunkName);
								entrypoint.remove();
								newChunk.entryModule = undefined;
							}
						}
						if (item.cacheGroup.filename) {
							if (!newChunk.isOnlyInitial()) {
								throw new Error(
									"SplitChunksPlugin: You are trying to set a filename for a chunk which is (also) loaded on demand. " +
										"The runtime can only handle loading of chunks which match the chunkFilename schema. " +
										"Using a custom filename would fail at runtime. " +
										`(cache group: ${item.cacheGroup.key})`
								);
							}
							newChunk.filenameTemplate = item.cacheGroup.filename;
						}
						if (!isReused) {
							// Add all modules to the new chunk
							for (const module of item.modules) {
								if (typeof module.chunkCondition === "function") {
									if (!module.chunkCondition(newChunk)) continue;
								}
								// Add module to new chunk
								GraphHelpers.connectChunkAndModule(newChunk, module);
								// Remove module from used chunks
								for (const chunk of usedChunks) {
									chunk.removeModule(module);
									module.rewriteChunkInReasons(chunk, [newChunk]);
								}
							}
						} else {
							// Remove all modules from used chunks
							for (const module of item.modules) {
								for (const chunk of usedChunks) {
									chunk.removeModule(module);
									module.rewriteChunkInReasons(chunk, [newChunk]);
								}
							}
						}
						// remove all modules from other entries and update size
						for (const [key, info] of chunksInfoMap) {
							if (isOverlap(info.chunks, item.chunks)) {
								const oldSize = info.modules.size;
								for (const module of item.modules) {
									info.modules.delete(module);
								}
								if (info.modules.size === 0) {
									chunksInfoMap.delete(key);
									continue;
								}
								if (info.modules.size !== oldSize) {
									info.size = getModulesSize(info.modules);
									if (info.size < info.cacheGroup.minSize) {
										chunksInfoMap.delete(key);
									}
								}
							}
						}
					}
				}
			);
		});
	}
};
