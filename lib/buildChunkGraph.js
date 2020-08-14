/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependencyToInitialChunkError = require("./AsyncDependencyToInitialChunkError");
const { connectChunkGroupParentAndChild } = require("./GraphHelpers");

/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Entrypoint")} Entrypoint */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./logging/Logger").Logger} Logger */

/**
 * @typedef {Object} QueueItem
 * @property {number} action
 * @property {DependenciesBlock} block
 * @property {Module} module
 * @property {Chunk} chunk
 * @property {ChunkGroup} chunkGroup
 * @property {ChunkGroupInfo} chunkGroupInfo
 */

/** @typedef {Set<Module> & { plus: Set<Module> }} ModuleSetPlus */

/**
 * @typedef {Object} ChunkGroupInfo
 * @property {ChunkGroup} chunkGroup the chunk group
 * @property {ModuleSetPlus} minAvailableModules current minimal set of modules available at this point
 * @property {boolean} minAvailableModulesOwned true, if minAvailableModules is owned and can be modified
 * @property {ModuleSetPlus[]} availableModulesToBeMerged enqueued updates to the minimal set of available modules
 * @property {Set<Module>=} skippedItems modules that were skipped because module is already available in parent chunks (need to reconsider when minAvailableModules is shrinking)
 * @property {ModuleSetPlus} resultingAvailableModules set of modules available including modules from this chunk group
 * @property {Set<ChunkGroupInfo>} children set of children chunk groups, that will be revisited when availableModules shrink
 * @property {Set<ChunkGroupInfo>} availableSources set of chunk groups that are the source for minAvailableModules
 * @property {Set<ChunkGroupInfo>} availableChildren set of chunk groups which depend on the this chunk group as availableSource
 * @property {number} preOrderIndex next pre order index
 * @property {number} postOrderIndex next post order index
 */

/**
 * @typedef {Object} ChunkGroupDep
 * @property {AsyncDependenciesBlock} block referencing block
 * @property {ChunkGroup} chunkGroup referenced chunk group
 */

const EMPTY_SET = /** @type {ModuleSetPlus} */ (new Set());
EMPTY_SET.plus = EMPTY_SET;

/**
 * @param {ModuleSetPlus} a first set
 * @param {ModuleSetPlus} b second set
 * @returns {number} cmp
 */
const bySetSize = (a, b) => {
	return b.size + b.plus.size - a.size - a.plus.size;
};

/**
 * Extracts block to modules mapping from all modules
 * @param {Compilation} compilation the compilation
 * @returns {Map<DependenciesBlock, Iterable<Module>>} the mapping block to modules
 */
const extractBlockModulesMap = compilation => {
	const { moduleGraph } = compilation;

	/** @type {Map<DependenciesBlock, Iterable<Module>>} */
	const blockModulesMap = new Map();

	const blockQueue = new Set();

	for (const module of compilation.modules) {
		/** @type {WeakMap<Dependency, Module>} */
		let moduleMap;

		for (const connection of moduleGraph.getOutgoingConnections(module)) {
			const d = connection.dependency;
			// We skip connections without dependency
			if (!d) continue;
			const m = connection.module;
			// We skip connections without Module pointer
			if (!m) continue;
			// We skip weak connections
			if (connection.weak) continue;
			// We skip inactive connections
			if (!connection.isActive(undefined)) continue;
			// Store Dependency to Module mapping in local map
			// to allow to access it faster compared to
			// moduleGraph.getConnection()
			if (moduleMap === undefined) {
				moduleMap = new WeakMap();
			}
			moduleMap.set(connection.dependency, m);
		}

		blockQueue.clear();
		blockQueue.add(module);
		for (const block of blockQueue) {
			let modules;

			if (moduleMap !== undefined && block.dependencies) {
				for (const dep of block.dependencies) {
					const module = moduleMap.get(dep);
					if (module !== undefined) {
						if (modules === undefined) {
							modules = new Set();
							blockModulesMap.set(block, modules);
						}
						modules.add(module);
					}
				}
			}

			if (block.blocks) {
				for (const b of block.blocks) {
					blockQueue.add(b);
				}
			}
		}
	}

	return blockModulesMap;
};

/**
 *
 * @param {Logger} logger a logger
 * @param {Compilation} compilation the compilation
 * @param {Map<Entrypoint, Module[]>} inputEntrypointsAndModules chunk groups which are processed with the modules
 * @param {Map<ChunkGroup, ChunkGroupInfo>} chunkGroupInfoMap mapping from chunk group to available modules
 * @param {Map<ChunkGroup, ChunkGroupDep[]>} chunkGroupDependencies dependencies for chunk groups
 * @param {Set<DependenciesBlock>} blocksWithNestedBlocks flag for blocks that have nested blocks
 * @param {Set<ChunkGroup>} allCreatedChunkGroups filled with all chunk groups that are created here
 */
const visitModules = (
	logger,
	compilation,
	inputEntrypointsAndModules,
	chunkGroupInfoMap,
	chunkGroupDependencies,
	blocksWithNestedBlocks,
	allCreatedChunkGroups
) => {
	const { moduleGraph, chunkGraph } = compilation;

	logger.time("visitModules: prepare");
	const blockModulesMap = extractBlockModulesMap(compilation);

	let statProcessedQueueItems = 0;
	let statProcessedBlocks = 0;
	let statConnectedChunkGroups = 0;
	let statProcessedChunkGroupsForMerging = 0;
	let statMergedAvailableModuleSets = 0;
	let statForkedAvailableModules = 0;
	let statForkedAvailableModulesCount = 0;
	let statForkedAvailableModulesCountPlus = 0;
	let statForkedMergedModulesCount = 0;
	let statForkedMergedModulesCountPlus = 0;
	let statForkedResultModulesCount = 0;
	let statChunkGroupInfoUpdated = 0;
	let statChildChunkGroupsReconnected = 0;

	let nextChunkGroupIndex = 0;
	let nextFreeModulePreOrderIndex = 0;
	let nextFreeModulePostOrderIndex = 0;

	/** @type {Map<DependenciesBlock, ChunkGroupInfo>} */
	const blockChunkGroups = new Map();

	/** @type {Map<string, ChunkGroupInfo>} */
	const namedChunkGroups = new Map();

	const ADD_AND_ENTER_MODULE = 0;
	const ENTER_MODULE = 1;
	const PROCESS_BLOCK = 2;
	const LEAVE_MODULE = 3;

	/** @type {QueueItem[]} */
	let queue = [];

	/** @type {Map<ChunkGroupInfo, Set<ChunkGroupInfo>>} */
	const queueConnect = new Map();
	/** @type {Set<ChunkGroupInfo>} */
	const chunkGroupsForCombining = new Set();

	// Fill queue with entrypoint modules
	// Create ChunkGroupInfo for entrypoints
	for (const [chunkGroup, modules] of inputEntrypointsAndModules) {
		/** @type {ChunkGroupInfo} */
		const chunkGroupInfo = {
			chunkGroup,
			minAvailableModules: undefined,
			minAvailableModulesOwned: false,
			availableModulesToBeMerged: [],
			skippedItems: undefined,
			resultingAvailableModules: undefined,
			children: undefined,
			availableSources: undefined,
			availableChildren: undefined,
			preOrderIndex: 0,
			postOrderIndex: 0
		};
		chunkGroup.index = nextChunkGroupIndex++;
		if (chunkGroup.getNumberOfParents() > 0) {
			// minAvailableModules for child entrypoints are unknown yet, set to undefined.
			// This means no module is added until other sets are merged into
			// this minAvailableModules (by the parent entrypoints)
			const skippedItems = new Set();
			for (const module of modules) {
				skippedItems.add(module);
			}
			chunkGroupInfo.skippedItems = skippedItems;
			chunkGroupsForCombining.add(chunkGroupInfo);
		} else {
			// The application may start here: We start with an empty list of available modules
			chunkGroupInfo.minAvailableModules = EMPTY_SET;
			const chunk = chunkGroup.getEntrypointChunk();
			for (const module of modules) {
				queue.push({
					action: ADD_AND_ENTER_MODULE,
					block: module,
					module,
					chunk,
					chunkGroup,
					chunkGroupInfo
				});
			}
		}
		chunkGroupInfoMap.set(chunkGroup, chunkGroupInfo);
		if (chunkGroup.name) {
			namedChunkGroups.set(chunkGroup.name, chunkGroupInfo);
		}
	}
	// Fill availableSources with parent-child dependencies between entrypoints
	for (const chunkGroupInfo of chunkGroupsForCombining) {
		const { chunkGroup } = chunkGroupInfo;
		chunkGroupInfo.availableSources = new Set();
		for (const parent of chunkGroup.parentsIterable) {
			const parentChunkGroupInfo = chunkGroupInfoMap.get(parent);
			chunkGroupInfo.availableSources.add(parentChunkGroupInfo);
			if (parentChunkGroupInfo.availableChildren === undefined) {
				parentChunkGroupInfo.availableChildren = new Set();
			}
			parentChunkGroupInfo.availableChildren.add(chunkGroupInfo);
		}
	}
	// pop() is used to read from the queue
	// so it need to be reversed to be iterated in
	// correct order
	queue.reverse();

	/** @type {Set<ChunkGroupInfo>} */
	const outdatedChunkGroupInfo = new Set();
	/** @type {Set<ChunkGroupInfo>} */
	const chunkGroupsForMerging = new Set();
	/** @type {QueueItem[]} */
	let queueDelayed = [];

	logger.timeEnd("visitModules: prepare");

	/** @type {Module[]} */
	const skipBuffer = [];
	/** @type {QueueItem[]} */
	const queueBuffer = [];

	/** @type {Module} */
	let module;
	/** @type {Chunk} */
	let chunk;
	/** @type {ChunkGroup} */
	let chunkGroup;
	/** @type {DependenciesBlock} */
	let block;
	/** @type {ChunkGroupInfo} */
	let chunkGroupInfo;

	// For each async Block in graph
	/**
	 * @param {AsyncDependenciesBlock} b iterating over each Async DepBlock
	 * @returns {void}
	 */
	const iteratorBlock = b => {
		// 1. We create a chunk group with single chunk in it for this Block
		// but only once (blockChunkGroups map)
		let cgi = blockChunkGroups.get(b);
		/** @type {ChunkGroup} */
		let c;
		if (cgi === undefined) {
			const chunkName = (b.groupOptions && b.groupOptions.name) || b.chunkName;
			cgi = namedChunkGroups.get(chunkName);
			if (!cgi) {
				c = compilation.addChunkInGroup(
					b.groupOptions || b.chunkName,
					module,
					b.loc,
					b.request
				);
				c.index = nextChunkGroupIndex++;
				cgi = {
					chunkGroup: c,
					minAvailableModules: undefined,
					minAvailableModulesOwned: undefined,
					availableModulesToBeMerged: [],
					skippedItems: undefined,
					resultingAvailableModules: undefined,
					children: undefined,
					availableSources: undefined,
					availableChildren: undefined,
					preOrderIndex: 0,
					postOrderIndex: 0
				};
				allCreatedChunkGroups.add(c);
				chunkGroupInfoMap.set(c, cgi);
				if (chunkName) {
					namedChunkGroups.set(chunkName, cgi);
				}
			} else {
				c = cgi.chunkGroup;
				if (c.isInitial()) {
					compilation.errors.push(
						new AsyncDependencyToInitialChunkError(chunkName, module, b.loc)
					);
					c = chunkGroup;
				}
				c.addOptions(b.groupOptions);
				c.addOrigin(module, b.loc, b.request);
			}
			blockChunkGroups.set(b, cgi);
		} else {
			c = cgi.chunkGroup;
		}

		// 2. We store the Block + Chunk Group mapping as dependency
		// for the chunk group which is set in processQueue
		let deps = chunkGroupDependencies.get(chunkGroup);
		if (!deps) chunkGroupDependencies.set(chunkGroup, (deps = []));
		deps.push({
			block: b,
			chunkGroup: c
		});

		// 3. We enqueue the chunk group info creation/updating
		let connectList = queueConnect.get(chunkGroupInfo);
		if (connectList === undefined) {
			connectList = new Set();
			queueConnect.set(chunkGroupInfo, connectList);
		}
		connectList.add(cgi);

		// 4. We enqueue the DependenciesBlock for traversal
		queueDelayed.push({
			action: PROCESS_BLOCK,
			block: b,
			module: module,
			chunk: c.chunks[0],
			chunkGroup: c,
			chunkGroupInfo: cgi
		});
	};

	/**
	 * @param {DependenciesBlock} block the block
	 * @returns {void}
	 */
	const processBlock = block => {
		statProcessedBlocks++;
		// get prepared block info
		const blockModules = blockModulesMap.get(block);

		if (blockModules !== undefined) {
			const { minAvailableModules } = chunkGroupInfo;
			// Buffer items because order need to be reversed to get indices correct
			// Traverse all referenced modules
			for (const refModule of blockModules) {
				if (chunkGraph.isModuleInChunk(refModule, chunk)) {
					// skip early if already connected
					continue;
				}
				if (
					minAvailableModules.has(refModule) ||
					minAvailableModules.plus.has(refModule)
				) {
					// already in parent chunks, skip it for now
					skipBuffer.push(refModule);
					continue;
				}
				// enqueue, then add and enter to be in the correct order
				// this is relevant with circular dependencies
				queueBuffer.push({
					action: ADD_AND_ENTER_MODULE,
					block: refModule,
					module: refModule,
					chunk,
					chunkGroup,
					chunkGroupInfo
				});
			}
			// Add buffered items in reverse order
			if (skipBuffer.length > 0) {
				let { skippedItems } = chunkGroupInfo;
				if (skippedItems === undefined) {
					chunkGroupInfo.skippedItems = skippedItems = new Set();
				}
				for (let i = skipBuffer.length - 1; i >= 0; i--) {
					skippedItems.add(skipBuffer[i]);
				}
				skipBuffer.length = 0;
			}
			if (queueBuffer.length > 0) {
				for (let i = queueBuffer.length - 1; i >= 0; i--) {
					queue.push(queueBuffer[i]);
				}
				queueBuffer.length = 0;
			}
		}

		// Traverse all Blocks
		for (const b of block.blocks) {
			if (b.isAsync(chunkGroup)) {
				iteratorBlock(b);
			} else {
				processBlock(b);
			}
		}

		if (block.blocks.length > 0 && module !== block) {
			blocksWithNestedBlocks.add(block);
		}
	};

	const processQueue = () => {
		while (queue.length) {
			statProcessedQueueItems++;
			const queueItem = queue.pop();
			module = queueItem.module;
			block = queueItem.block;
			chunk = queueItem.chunk;
			chunkGroup = queueItem.chunkGroup;
			chunkGroupInfo = queueItem.chunkGroupInfo;

			switch (queueItem.action) {
				case ADD_AND_ENTER_MODULE: {
					if (chunkGraph.isModuleInChunk(module, chunk)) {
						// already connected, skip it
						break;
					}
					// We connect Module and Chunk
					chunkGraph.connectChunkAndModule(chunk, module);
				}
				// fallthrough
				case ENTER_MODULE: {
					const index = chunkGroup.getModulePreOrderIndex(module);
					if (index === undefined) {
						chunkGroup.setModulePreOrderIndex(
							module,
							chunkGroupInfo.preOrderIndex++
						);
					}

					if (
						moduleGraph.setPreOrderIndexIfUnset(
							module,
							nextFreeModulePreOrderIndex
						)
					) {
						nextFreeModulePreOrderIndex++;
					}

					// reuse queueItem
					queueItem.action = LEAVE_MODULE;
					queue.push(queueItem);
				}
				// fallthrough
				case PROCESS_BLOCK: {
					processBlock(block);
					break;
				}
				case LEAVE_MODULE: {
					const index = chunkGroup.getModulePostOrderIndex(module);
					if (index === undefined) {
						chunkGroup.setModulePostOrderIndex(
							module,
							chunkGroupInfo.postOrderIndex++
						);
					}

					if (
						moduleGraph.setPostOrderIndexIfUnset(
							module,
							nextFreeModulePostOrderIndex
						)
					) {
						nextFreeModulePostOrderIndex++;
					}
					break;
				}
			}
		}
	};

	const calculateResultingAvailableModules = chunkGroupInfo => {
		if (chunkGroupInfo.resultingAvailableModules)
			return chunkGroupInfo.resultingAvailableModules;

		const minAvailableModules = chunkGroupInfo.minAvailableModules;

		// Create a new Set of available modules at this point
		// We want to be as lazy as possible. There are multiple ways doing this:
		// Note that resultingAvailableModules is stored as "(a) + (b)" as it's a ModuleSetPlus
		// - resultingAvailableModules = (modules of chunk) + (minAvailableModules + minAvailableModules.plus)
		// - resultingAvailableModules = (minAvailableModules + modules of chunk) + (minAvailableModules.plus)
		// We choose one depending on the size of minAvailableModules vs minAvailableModules.plus

		let resultingAvailableModules;
		if (minAvailableModules.size > minAvailableModules.plus.size) {
			// resultingAvailableModules = (modules of chunk) + (minAvailableModules + minAvailableModules.plus)
			resultingAvailableModules = /** @type {Set<Module> & {plus: Set<Module>}} */ (new Set());
			for (const module of minAvailableModules.plus)
				minAvailableModules.add(module);
			minAvailableModules.plus = EMPTY_SET;
			resultingAvailableModules.plus = minAvailableModules;
			chunkGroupInfo.minAvailableModulesOwned = false;
		} else {
			// resultingAvailableModules = (minAvailableModules + modules of chunk) + (minAvailableModules.plus)
			resultingAvailableModules = /** @type {Set<Module> & {plus: Set<Module>}} */ (new Set(
				minAvailableModules
			));
			resultingAvailableModules.plus = minAvailableModules.plus;
		}

		// add the modules from the chunk group to the set
		for (const chunk of chunkGroupInfo.chunkGroup.chunks) {
			for (const m of chunkGraph.getChunkModulesIterable(chunk)) {
				resultingAvailableModules.add(m);
			}
		}
		return (chunkGroupInfo.resultingAvailableModules = resultingAvailableModules);
	};

	const processConnectQueue = () => {
		// Figure out new parents for chunk groups
		// to get new available modules for these children
		for (const [chunkGroupInfo, targets] of queueConnect) {
			// 1. Add new targets to the list of children
			if (chunkGroupInfo.children === undefined) {
				chunkGroupInfo.children = targets;
			} else {
				for (const target of targets) {
					chunkGroupInfo.children.add(target);
				}
			}

			// 2. Calculate resulting available modules
			const resultingAvailableModules = calculateResultingAvailableModules(
				chunkGroupInfo
			);

			// 3. Update chunk group info
			for (const target of targets) {
				target.availableModulesToBeMerged.push(resultingAvailableModules);
				chunkGroupsForMerging.add(target);
			}

			statConnectedChunkGroups += targets.size;
		}
		queueConnect.clear();
	};

	const processChunkGroupsForMerging = () => {
		statProcessedChunkGroupsForMerging += chunkGroupsForMerging.size;

		// Execute the merge
		for (const info of chunkGroupsForMerging) {
			const availableModulesToBeMerged = info.availableModulesToBeMerged;
			let cachedMinAvailableModules = info.minAvailableModules;

			statMergedAvailableModuleSets += availableModulesToBeMerged.length;

			// 1. Get minimal available modules
			// It doesn't make sense to traverse a chunk again with more available modules.
			// This step calculates the minimal available modules and skips traversal when
			// the list didn't shrink.
			if (availableModulesToBeMerged.length > 1) {
				availableModulesToBeMerged.sort(bySetSize);
			}
			let changed = false;
			merge: for (const availableModules of availableModulesToBeMerged) {
				if (cachedMinAvailableModules === undefined) {
					cachedMinAvailableModules = availableModules;
					info.minAvailableModules = cachedMinAvailableModules;
					info.minAvailableModulesOwned = false;
					changed = true;
				} else {
					if (info.minAvailableModulesOwned) {
						// We own it and can modify it
						if (cachedMinAvailableModules.plus === availableModules.plus) {
							for (const m of cachedMinAvailableModules) {
								if (!availableModules.has(m)) {
									cachedMinAvailableModules.delete(m);
									changed = true;
								}
							}
						} else {
							for (const m of cachedMinAvailableModules) {
								if (!availableModules.has(m) && !availableModules.plus.has(m)) {
									cachedMinAvailableModules.delete(m);
									changed = true;
								}
							}
							for (const m of cachedMinAvailableModules.plus) {
								if (!availableModules.has(m) && !availableModules.plus.has(m)) {
									// We can't remove modules from the plus part
									// so we need to merge plus into the normal part to allow modifying it
									const iterator = cachedMinAvailableModules.plus[
										Symbol.iterator
									]();
									// fast forward add all modules until m
									/** @type {IteratorResult<Module>} */
									let it;
									while (!(it = iterator.next()).done) {
										const module = it.value;
										if (module === m) break;
										cachedMinAvailableModules.add(module);
									}
									// check the remaining modules before adding
									while (!(it = iterator.next()).done) {
										const module = it.value;
										if (
											availableModules.has(module) ||
											availableModules.plus.has(m)
										) {
											cachedMinAvailableModules.add(module);
										}
									}
									cachedMinAvailableModules.plus = EMPTY_SET;
									changed = true;
									continue merge;
								}
							}
						}
					} else if (cachedMinAvailableModules.plus === availableModules.plus) {
						// Common and fast case when the plus part is shared
						// We only need to care about the normal part
						if (availableModules.size < cachedMinAvailableModules.size) {
							// the new availableModules is smaller so it's faster to
							// fork from the new availableModules
							statForkedAvailableModules++;
							statForkedAvailableModulesCount += availableModules.size;
							statForkedMergedModulesCount += cachedMinAvailableModules.size;
							// construct a new Set as intersection of cachedMinAvailableModules and availableModules
							const newSet = /** @type {ModuleSetPlus} */ (new Set());
							newSet.plus = availableModules.plus;
							for (const m of availableModules) {
								if (cachedMinAvailableModules.has(m)) {
									newSet.add(m);
								}
							}
							statForkedResultModulesCount += newSet.size;
							cachedMinAvailableModules = newSet;
							info.minAvailableModulesOwned = true;
							info.minAvailableModules = newSet;
							changed = true;
							continue merge;
						}
						for (const m of cachedMinAvailableModules) {
							if (!availableModules.has(m)) {
								// cachedMinAvailableModules need to be modified
								// but we don't own it
								statForkedAvailableModules++;
								statForkedAvailableModulesCount +=
									cachedMinAvailableModules.size;
								statForkedMergedModulesCount += availableModules.size;
								// construct a new Set as intersection of cachedMinAvailableModules and availableModules
								// as the plus part is equal we can just take over this one
								const newSet = /** @type {ModuleSetPlus} */ (new Set());
								newSet.plus = availableModules.plus;
								const iterator = cachedMinAvailableModules[Symbol.iterator]();
								// fast forward add all modules until m
								/** @type {IteratorResult<Module>} */
								let it;
								while (!(it = iterator.next()).done) {
									const module = it.value;
									if (module === m) break;
									newSet.add(module);
								}
								// check the remaining modules before adding
								while (!(it = iterator.next()).done) {
									const module = it.value;
									if (availableModules.has(module)) {
										newSet.add(module);
									}
								}
								statForkedResultModulesCount += newSet.size;
								cachedMinAvailableModules = newSet;
								info.minAvailableModulesOwned = true;
								info.minAvailableModules = newSet;
								changed = true;
								continue merge;
							}
						}
					} else {
						for (const m of cachedMinAvailableModules) {
							if (!availableModules.has(m) && !availableModules.plus.has(m)) {
								// cachedMinAvailableModules need to be modified
								// but we don't own it
								statForkedAvailableModules++;
								statForkedAvailableModulesCount +=
									cachedMinAvailableModules.size;
								statForkedAvailableModulesCountPlus +=
									cachedMinAvailableModules.plus.size;
								statForkedMergedModulesCount += availableModules.size;
								statForkedMergedModulesCountPlus += availableModules.plus.size;
								// construct a new Set as intersection of cachedMinAvailableModules and availableModules
								const newSet = /** @type {ModuleSetPlus} */ (new Set());
								newSet.plus = EMPTY_SET;
								const iterator = cachedMinAvailableModules[Symbol.iterator]();
								// fast forward add all modules until m
								/** @type {IteratorResult<Module>} */
								let it;
								while (!(it = iterator.next()).done) {
									const module = it.value;
									if (module === m) break;
									newSet.add(module);
								}
								// check the remaining modules before adding
								while (!(it = iterator.next()).done) {
									const module = it.value;
									if (
										availableModules.has(module) ||
										availableModules.plus.has(module)
									) {
										newSet.add(module);
									}
								}
								// also check all modules in cachedMinAvailableModules.plus
								for (const module of cachedMinAvailableModules.plus) {
									if (
										availableModules.has(module) ||
										availableModules.plus.has(module)
									) {
										newSet.add(module);
									}
								}
								statForkedResultModulesCount += newSet.size;
								cachedMinAvailableModules = newSet;
								info.minAvailableModulesOwned = true;
								info.minAvailableModules = newSet;
								changed = true;
								continue merge;
							}
						}
						for (const m of cachedMinAvailableModules.plus) {
							if (!availableModules.has(m) && !availableModules.plus.has(m)) {
								// cachedMinAvailableModules need to be modified
								// but we don't own it
								statForkedAvailableModules++;
								statForkedAvailableModulesCount +=
									cachedMinAvailableModules.size;
								statForkedAvailableModulesCountPlus +=
									cachedMinAvailableModules.plus.size;
								statForkedMergedModulesCount += availableModules.size;
								statForkedMergedModulesCountPlus += availableModules.plus.size;
								// construct a new Set as intersection of cachedMinAvailableModules and availableModules
								// we already know that all modules directly from cachedMinAvailableModules are in availableModules too
								const newSet = /** @type {ModuleSetPlus} */ (new Set(
									cachedMinAvailableModules
								));
								newSet.plus = EMPTY_SET;
								const iterator = cachedMinAvailableModules.plus[
									Symbol.iterator
								]();
								// fast forward add all modules until m
								/** @type {IteratorResult<Module>} */
								let it;
								while (!(it = iterator.next()).done) {
									const module = it.value;
									if (module === m) break;
									newSet.add(module);
								}
								// check the remaining modules before adding
								while (!(it = iterator.next()).done) {
									const module = it.value;
									if (
										availableModules.has(module) ||
										availableModules.plus.has(module)
									) {
										newSet.add(module);
									}
								}
								statForkedResultModulesCount += newSet.size;
								cachedMinAvailableModules = newSet;
								info.minAvailableModulesOwned = true;
								info.minAvailableModules = newSet;
								changed = true;
								continue merge;
							}
						}
					}
				}
			}
			availableModulesToBeMerged.length = 0;
			if (changed) {
				info.resultingAvailableModules = undefined;
				outdatedChunkGroupInfo.add(info);
			}
		}
		chunkGroupsForMerging.clear();
	};

	const processChunkGroupsForCombining = () => {
		loop: for (const info of chunkGroupsForCombining) {
			for (const source of info.availableSources) {
				if (!source.minAvailableModules) continue loop;
			}
			const availableModules = /** @type {ModuleSetPlus} */ (new Set());
			availableModules.plus = EMPTY_SET;
			const mergeSet = set => {
				if (set.size > availableModules.plus.size) {
					for (const item of availableModules.plus) availableModules.add(item);
					availableModules.plus = set;
				} else {
					for (const item of set) availableModules.add(item);
				}
			};
			// combine minAvailableModules from all resultingAvailableModules
			for (const source of info.availableSources) {
				const resultingAvailableModules = calculateResultingAvailableModules(
					source
				);
				mergeSet(resultingAvailableModules);
				mergeSet(resultingAvailableModules.plus);
			}
			info.minAvailableModules = availableModules;
			info.minAvailableModulesOwned = false;
			info.resultingAvailableModules = undefined;
			outdatedChunkGroupInfo.add(info);
		}
		chunkGroupsForCombining.clear();
	};

	const processOutdatedChunkGroupInfo = () => {
		statChunkGroupInfoUpdated += outdatedChunkGroupInfo.size;
		// Revisit skipped elements
		for (const info of outdatedChunkGroupInfo) {
			// 1. Reconsider skipped items
			if (info.skippedItems !== undefined) {
				const { minAvailableModules } = info;
				for (const module of info.skippedItems) {
					if (
						!minAvailableModules.has(module) &&
						!minAvailableModules.plus.has(module)
					) {
						queue.push({
							action: ADD_AND_ENTER_MODULE,
							block: module,
							module,
							chunk: info.chunkGroup.chunks[0],
							chunkGroup: info.chunkGroup,
							chunkGroupInfo: info
						});
						info.skippedItems.delete(module);
					}
				}
			}

			// 2. Reconsider children chunk groups
			if (info.children !== undefined) {
				statChildChunkGroupsReconnected += info.children.size;
				for (const cgi of info.children) {
					let connectList = queueConnect.get(info);
					if (connectList === undefined) {
						connectList = new Set();
						queueConnect.set(info, connectList);
					}
					connectList.add(cgi);
				}
			}

			// 3. Reconsider chunk groups for combining
			if (info.availableChildren !== undefined) {
				for (const cgi of info.availableChildren) {
					chunkGroupsForCombining.add(cgi);
				}
			}
		}
		outdatedChunkGroupInfo.clear();
	};

	// Iterative traversal of the Module graph
	// Recursive would be simpler to write but could result in Stack Overflows
	while (queue.length || queueConnect.size) {
		logger.time("visitModules: visiting");
		processQueue();
		logger.timeEnd("visitModules: visiting");

		if (chunkGroupsForCombining.size > 0) {
			logger.time("visitModules: combine available modules");
			processChunkGroupsForCombining();
			logger.timeEnd("visitModules: combine available modules");
		}

		if (queueConnect.size > 0) {
			logger.time("visitModules: calculating available modules");
			processConnectQueue();
			logger.timeEnd("visitModules: calculating available modules");

			if (chunkGroupsForMerging.size > 0) {
				logger.time("visitModules: merging available modules");
				processChunkGroupsForMerging();
				logger.timeEnd("visitModules: merging available modules");
			}
		}

		if (outdatedChunkGroupInfo.size > 0) {
			logger.time("visitModules: check modules for revisit");
			processOutdatedChunkGroupInfo();
			logger.timeEnd("visitModules: check modules for revisit");
		}

		// Run queueDelayed when all items of the queue are processed
		// This is important to get the global indexing correct
		// Async blocks should be processed after all sync blocks are processed
		if (queue.length === 0) {
			const tempQueue = queue;
			queue = queueDelayed.reverse();
			queueDelayed = tempQueue;
		}
	}

	logger.log(
		`${statProcessedQueueItems} queue items processed (${statProcessedBlocks} blocks)`
	);
	logger.log(`${statConnectedChunkGroups} chunk groups connected`);
	logger.log(
		`${statProcessedChunkGroupsForMerging} chunk groups processed for merging (${statMergedAvailableModuleSets} module sets, ${statForkedAvailableModules} forked, ${statForkedAvailableModulesCount} + ${statForkedAvailableModulesCountPlus} modules forked, ${statForkedMergedModulesCount} + ${statForkedMergedModulesCountPlus} modules merged into fork, ${statForkedResultModulesCount} resulting modules)`
	);
	logger.log(
		`${statChunkGroupInfoUpdated} chunk group info updated (${statChildChunkGroupsReconnected} already connected chunk groups reconnected)`
	);
};

/**
 *
 * @param {Compilation} compilation the compilation
 * @param {Set<DependenciesBlock>} blocksWithNestedBlocks flag for blocks that have nested blocks
 * @param {Map<ChunkGroup, ChunkGroupDep[]>} chunkGroupDependencies dependencies for chunk groups
 * @param {Map<ChunkGroup, ChunkGroupInfo>} chunkGroupInfoMap mapping from chunk group to available modules
 */
const connectChunkGroups = (
	compilation,
	blocksWithNestedBlocks,
	chunkGroupDependencies,
	chunkGroupInfoMap
) => {
	const { chunkGraph } = compilation;

	/** @type {ModuleSetPlus} */
	let resultingAvailableModules;

	/**
	 * Helper function to check if all modules of a chunk are available
	 *
	 * @param {ChunkGroup} chunkGroup the chunkGroup to scan
	 * @param {ModuleSetPlus} availableModules the comparator set
	 * @returns {boolean} return true if all modules of a chunk are available
	 */
	const areModulesAvailable = (chunkGroup, availableModules) => {
		for (const chunk of chunkGroup.chunks) {
			for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
				if (!availableModules.has(module) && !availableModules.plus.has(module))
					return false;
			}
		}
		return true;
	};

	// For each edge in the basic chunk graph
	/**
	 * @param {ChunkGroupDep} dep the dependency used for filtering
	 * @returns {boolean} used to filter "edges" (aka Dependencies) that were pointing
	 * to modules that are already available. Also filters circular dependencies in the chunks graph
	 */
	const filterFn = dep => {
		const depChunkGroup = dep.chunkGroup;
		// TODO is this needed?
		if (blocksWithNestedBlocks.has(dep.block)) return true;
		if (areModulesAvailable(depChunkGroup, resultingAvailableModules)) {
			return false; // break all modules are already available
		}
		return true;
	};

	// For all deps, check if chunk groups need to be connected
	for (const [chunkGroup, deps] of chunkGroupDependencies) {
		if (deps.length === 0) continue;

		// 1. Get info from chunk group info map
		const info = chunkGroupInfoMap.get(chunkGroup);
		resultingAvailableModules = info.resultingAvailableModules;

		// 2. Foreach edge
		for (let i = 0; i < deps.length; i++) {
			const dep = deps[i];

			// Filter inline, rather than creating a new array from `.filter()`
			// TODO check if inlining filterFn makes sense here
			if (!filterFn(dep)) {
				continue;
			}
			const depChunkGroup = dep.chunkGroup;
			const depBlock = dep.block;

			// 5. Connect block with chunk
			chunkGraph.connectBlockAndChunkGroup(depBlock, depChunkGroup);

			// 6. Connect chunk with parent
			connectChunkGroupParentAndChild(chunkGroup, depChunkGroup);
		}
	}
};

/**
 * Remove all unconnected chunk groups
 * @param {Compilation} compilation the compilation
 * @param {Iterable<ChunkGroup>} allCreatedChunkGroups all chunk groups that where created before
 */
const cleanupUnconnectedGroups = (compilation, allCreatedChunkGroups) => {
	const { chunkGraph } = compilation;

	for (const chunkGroup of allCreatedChunkGroups) {
		if (chunkGroup.getNumberOfParents() === 0) {
			for (const chunk of chunkGroup.chunks) {
				compilation.chunks.delete(chunk);
				chunkGraph.disconnectChunk(chunk);
			}
			chunkGraph.disconnectChunkGroup(chunkGroup);
			chunkGroup.remove();
		}
	}
};

/**
 * This method creates the Chunk graph from the Module graph
 * @param {Compilation} compilation the compilation
 * @param {Map<Entrypoint, Module[]>} inputEntrypointsAndModules chunk groups which are processed with the modules
 * @returns {void}
 */
const buildChunkGraph = (compilation, inputEntrypointsAndModules) => {
	const logger = compilation.getLogger("webpack.buildChunkGraph");

	// SHARED STATE

	/** @type {Map<ChunkGroup, ChunkGroupDep[]>} */
	const chunkGroupDependencies = new Map();

	/** @type {Set<ChunkGroup>} */
	const allCreatedChunkGroups = new Set();

	/** @type {Map<ChunkGroup, ChunkGroupInfo>} */
	const chunkGroupInfoMap = new Map();

	/** @type {Set<DependenciesBlock>} */
	const blocksWithNestedBlocks = new Set();

	// PART ONE

	logger.time("visitModules");
	visitModules(
		logger,
		compilation,
		inputEntrypointsAndModules,
		chunkGroupInfoMap,
		chunkGroupDependencies,
		blocksWithNestedBlocks,
		allCreatedChunkGroups
	);
	logger.timeEnd("visitModules");

	// PART TWO

	logger.time("connectChunkGroups");
	connectChunkGroups(
		compilation,
		blocksWithNestedBlocks,
		chunkGroupDependencies,
		chunkGroupInfoMap
	);
	logger.timeEnd("connectChunkGroups");

	// Cleanup work

	logger.time("cleanup");
	cleanupUnconnectedGroups(compilation, allCreatedChunkGroups);
	logger.timeEnd("cleanup");
};

module.exports = buildChunkGraph;
