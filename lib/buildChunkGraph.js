/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependencyToInitialChunkError = require("./AsyncDependencyToInitialChunkError");
const { connectChunkGroupParentAndChild } = require("./GraphHelpers");
const Queue = require("./util/Queue");

/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Entrypoint")} Entrypoint */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */

/**
 * @template T
 * @param {Set<T>} a first set
 * @param {Set<T>} b second set
 * @returns {number} cmp
 */
const bySetSize = (a, b) => {
	return a.size - b.size;
};

/**
 * Extracts simplified info from the modules and their dependencies
 * @param {Compilation} compilation the compilation
 * @returns {Map<DependenciesBlock, { modules: Module[], blocks: AsyncDependenciesBlock[]}>} the mapping block to modules and inner blocks
 */
const extraceBlockInfoMap = compilation => {
	/** @type {Map<DependenciesBlock, { modules: Module[], blocks: AsyncDependenciesBlock[]}>} */
	const blockInfoMap = new Map();

	/**
	 * @param {Dependency} d dependency to iterate over
	 * @returns {void}
	 */
	const iteratorDependency = d => {
		// We skip Dependencies without Reference
		const ref = compilation.getDependencyReference(d);
		if (!ref) {
			return;
		}
		// We skip Dependencies without Module pointer
		const refModule = ref.module;
		if (!refModule) {
			return;
		}
		// We skip weak Dependencies
		if (ref.weak) {
			return;
		}

		blockInfoModules.add(refModule);
	};

	/**
	 * @param {AsyncDependenciesBlock} b blocks to prepare
	 * @returns {void}
	 */
	const iteratorBlockPrepare = b => {
		blockInfoBlocks.push(b);
		blockQueue.push(b);
	};

	/** @type {DependenciesBlock} */
	let block;
	/** @type {DependenciesBlock[]} */
	let blockQueue;
	/** @type {Set<Module>} */
	let blockInfoModules;
	/** @type {AsyncDependenciesBlock[]} */
	let blockInfoBlocks;

	for (const module of compilation.modules) {
		blockQueue = [module];
		while (blockQueue.length > 0) {
			block = blockQueue.pop();
			blockInfoModules = new Set();
			blockInfoBlocks = [];

			if (block.dependencies) {
				for (const dep of block.dependencies) iteratorDependency(dep);
			}

			if (block.blocks) {
				for (const b of block.blocks) iteratorBlockPrepare(b);
			}

			const blockInfo = {
				modules: Array.from(blockInfoModules),
				blocks: blockInfoBlocks
			};
			blockInfoMap.set(block, blockInfo);
		}
	}

	return blockInfoMap;
};

/**
 * This method creates the Chunk graph from the Module graph
 * @param {Compilation} compilation the compilation
 * @param {Entrypoint[]} inputChunkGroups chunk groups which are processed
 * @returns {void}
 */
const buildChunkGraph = (compilation, inputChunkGroups) => {
	// Process is splitting into two parts:
	// Part one traverse the module graph and builds a very basic chunks graph
	//   in chunkDependencies.
	// Part two traverse every possible way through the basic chunk graph and
	//   tracks the available modules. While traversing it connects chunks with
	//   eachother and Blocks with Chunks. It stops traversing when all modules
	//   for a chunk are already available. So it doesn't connect unneeded chunks.

	/** @typedef {{block: AsyncDependenciesBlock, chunkGroup: ChunkGroup, couldBeFiltered: boolean}} ChunkGroupDep */

	const { moduleGraph } = compilation;

	/** @type {Map<ChunkGroup, ChunkGroupDep[]>} */
	const chunkDependencies = new Map();
	/** @type {Set<ChunkGroup>} */
	const allCreatedChunkGroups = new Set();

	// PREPARE
	const blockInfoMap = extraceBlockInfoMap(compilation);

	const { chunkGraph, namedChunkGroups } = compilation;

	// PART ONE

	/** @type {Map<ChunkGroup, { preOrderIndex: number, postOrderIndex: number }>} */
	const chunkGroupCounters = new Map();
	for (const chunkGroup of inputChunkGroups) {
		chunkGroupCounters.set(chunkGroup, {
			preOrderIndex: 0,
			postOrderIndex: 0
		});
	}

	let nextFreeModulePreOrderIndex = 0;
	let nextFreeModulePostOrderIndex = 0;

	/** @type {Map<DependenciesBlock, ChunkGroup>} */
	const blockChunkGroups = new Map();

	/** @type {Set<DependenciesBlock>} */
	const blocksWithNestedBlocks = new Set();

	const ADD_AND_ENTER_MODULE = 0;
	const ENTER_MODULE = 1;
	const PROCESS_BLOCK = 2;
	const LEAVE_MODULE = 3;

	/**
	 * @typedef {Object} QueueItem
	 * @property {number} action
	 * @property {DependenciesBlock} block
	 * @property {Module} module
	 * @property {Chunk} chunk
	 * @property {ChunkGroup} chunkGroup
	 */

	/**
	 * @param {QueueItem[]} queue the queue array (will be mutated)
	 * @param {ChunkGroup} chunkGroup chunk group
	 * @returns {QueueItem[]} the queue array again
	 */
	const reduceChunkGroupToQueueItem = (queue, chunkGroup) => {
		for (const chunk of chunkGroup.chunks) {
			for (const module of chunkGraph.getChunkEntryModulesIterable(chunk)) {
				queue.push({
					action: ENTER_MODULE,
					block: module,
					module,
					chunk,
					chunkGroup
				});
			}
		}
		return queue;
	};

	// Start with the provided modules/chunks
	/** @type {QueueItem[]} */
	let queue = inputChunkGroups
		.reduce(reduceChunkGroupToQueueItem, [])
		.reverse();
	/** @type {QueueItem[]} */
	let queueDelayed = [];

	/** @type {Module} */
	let module;
	/** @type {Chunk} */
	let chunk;
	/** @type {ChunkGroup} */
	let chunkGroup;
	/** @type {DependenciesBlock} */
	let block;

	// For each async Block in graph
	/**
	 * @param {AsyncDependenciesBlock} b iterating over each Async DepBlock
	 * @returns {void}
	 */
	const iteratorBlock = b => {
		// 1. We create a chunk for this Block
		// but only once (blockChunkGroups map)
		let c = blockChunkGroups.get(b);
		if (c === undefined) {
			c = namedChunkGroups.get(b.chunkName);
			if (c && c.isInitial()) {
				compilation.errors.push(
					new AsyncDependencyToInitialChunkError(b.chunkName, module, b.loc)
				);
				c = chunkGroup;
			} else {
				c = compilation.addChunkInGroup(
					b.groupOptions || b.chunkName,
					module,
					b.loc,
					b.request
				);
				chunkGroupCounters.set(c, { preOrderIndex: 0, postOrderIndex: 0 });
				blockChunkGroups.set(b, c);
				allCreatedChunkGroups.add(c);
			}
		} else {
			c.addOptions(b.groupOptions);
			c.addOrigin(module, b.loc, b.request);
		}

		// 2. We store the Block+Chunk mapping as dependency for the chunk
		let deps = chunkDependencies.get(chunkGroup);
		if (!deps) chunkDependencies.set(chunkGroup, (deps = []));
		deps.push({
			block: b,
			chunkGroup: c,
			couldBeFiltered: true
		});

		// 3. We enqueue the DependenciesBlock for traversal
		queueDelayed.push({
			action: PROCESS_BLOCK,
			block: b,
			module: module,
			chunk: c.chunks[0],
			chunkGroup: c
		});
	};

	// Iterative traversal of the Module graph
	// Recursive would be simpler to write but could result in Stack Overflows
	while (queue.length) {
		while (queue.length) {
			const queueItem = queue.pop();
			module = queueItem.module;
			block = queueItem.block;
			chunk = queueItem.chunk;
			chunkGroup = queueItem.chunkGroup;

			switch (queueItem.action) {
				case ADD_AND_ENTER_MODULE: {
					// We connect Module and Chunk when not already done
					if (!chunkGraph.connectChunkAndModule(chunk, module)) {
						// already connected, skip it
						break;
					}
				}
				// fallthrough
				case ENTER_MODULE: {
					if (chunkGroup !== undefined) {
						const index = chunkGroup.getModulePreOrderIndex(module);
						if (index === undefined) {
							chunkGroup.setModulePreOrderIndex(
								module,
								chunkGroupCounters.get(chunkGroup).preOrderIndex++
							);
						}
					}

					if (
						moduleGraph.setPreOrderIndexIfUnset(
							module,
							nextFreeModulePreOrderIndex
						)
					) {
						nextFreeModulePreOrderIndex++;
					}

					queue.push({
						action: LEAVE_MODULE,
						block,
						module,
						chunk,
						chunkGroup
					});
				}
				// fallthrough
				case PROCESS_BLOCK: {
					// get prepared block info
					const blockInfo = blockInfoMap.get(block);

					// Traverse all referenced modules
					for (let i = blockInfo.modules.length - 1; i >= 0; i--) {
						const refModule = blockInfo.modules[i];
						if (chunkGraph.isModuleInChunk(refModule, chunk)) {
							// skip early if already connected
							continue;
						}
						// enqueue the add and enter to enter in the correct order
						// this is relevant with circular dependencies
						queue.push({
							action: ADD_AND_ENTER_MODULE,
							block: refModule,
							module: refModule,
							chunk,
							chunkGroup
						});
					}

					// Traverse all Blocks
					for (const block of blockInfo.blocks) iteratorBlock(block);

					if (blockInfo.blocks.length > 0 && module !== block) {
						blocksWithNestedBlocks.add(block);
					}
					break;
				}
				case LEAVE_MODULE: {
					if (chunkGroup !== undefined) {
						const index = chunkGroup.getModulePostOrderIndex(module);
						if (index === undefined) {
							chunkGroup.setModulePostOrderIndex(
								module,
								chunkGroupCounters.get(chunkGroup).postOrderIndex++
							);
						}
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
		const tempQueue = queue;
		queue = queueDelayed.reverse();
		queueDelayed = tempQueue;
	}

	// PART TWO
	/** @type {Set<Module>} */
	let newAvailableModules;

	/**
	 * @typedef {Object} ChunkGroupInfo
	 * @property {Set<Module>} minAvailableModules current minimal set of modules available at this point
	 * @property {Set<Module>[]} availableModulesToBeMerged enqueued updates to the minimal set of available modules
	 */

	/** @type {Map<ChunkGroup, ChunkGroupInfo>} */
	const chunkGroupInfoMap = new Map();

	/** @type {Queue<ChunkGroup>} */
	const queue2 = new Queue(inputChunkGroups);

	for (const chunkGroup of inputChunkGroups) {
		chunkGroupInfoMap.set(chunkGroup, {
			minAvailableModules: undefined,
			availableModulesToBeMerged: [new Set()]
		});
	}

	/**
	 * Helper function to check if all modules of a chunk are available
	 *
	 * @param {ChunkGroup} chunkGroup the chunkGroup to scan
	 * @param {Set<Module>} availableModules the comparitor set
	 * @returns {boolean} return true if all modules of a chunk are available
	 */
	const areModulesAvailable = (chunkGroup, availableModules) => {
		for (const chunk of chunkGroup.chunks) {
			for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
				if (!availableModules.has(module)) return false;
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
		if (!dep.couldBeFiltered) return true;
		if (blocksWithNestedBlocks.has(dep.block)) return true;
		if (areModulesAvailable(depChunkGroup, newAvailableModules)) {
			return false; // break all modules are already available
		}
		dep.couldBeFiltered = false;
		return true;
	};

	// Iterative traversing of the basic chunk graph
	while (queue2.length) {
		chunkGroup = queue2.dequeue();
		const info = chunkGroupInfoMap.get(chunkGroup);
		const availableModulesToBeMerged = info.availableModulesToBeMerged;
		let minAvailableModules = info.minAvailableModules;

		// 1. Get minimal available modules
		// It doesn't make sense to traverse a chunk again with more available modules.
		// This step calculates the minimal available modules and skips traversal when
		// the list didn't shrink.
		availableModulesToBeMerged.sort(bySetSize);
		let changed = false;
		for (const availableModules of availableModulesToBeMerged) {
			if (minAvailableModules === undefined) {
				minAvailableModules = new Set(availableModules);
				info.minAvailableModules = minAvailableModules;
				changed = true;
			} else {
				for (const m of minAvailableModules) {
					if (!availableModules.has(m)) {
						minAvailableModules.delete(m);
						changed = true;
					}
				}
			}
		}
		availableModulesToBeMerged.length = 0;
		if (!changed) continue;

		// 2. Get the edges at this point of the graph
		const deps = chunkDependencies.get(chunkGroup);
		if (!deps) continue;
		if (deps.length === 0) continue;

		// 3. Create a new Set of available modules at this points
		newAvailableModules = new Set(minAvailableModules);
		for (const chunk of chunkGroup.chunks) {
			for (const m of chunkGraph.getChunkModulesIterable(chunk)) {
				newAvailableModules.add(m);
			}
		}

		// 4. Foreach remaining edge
		const nextChunkGroups = new Set();
		for (let i = 0; i < deps.length; i++) {
			const dep = deps[i];

			// Filter inline, rather than creating a new array from `.filter()`
			if (!filterFn(dep)) {
				continue;
			}
			const depChunkGroup = dep.chunkGroup;
			const depBlock = dep.block;

			// 5. Connect block with chunk
			chunkGraph.connectBlockAndChunkGroup(depBlock, depChunkGroup);

			// 6. Connect chunk with parent
			connectChunkGroupParentAndChild(chunkGroup, depChunkGroup);

			nextChunkGroups.add(depChunkGroup);
		}

		// 7. Enqueue further traversal
		for (const nextChunkGroup of nextChunkGroups) {
			let nextInfo = chunkGroupInfoMap.get(nextChunkGroup);
			if (nextInfo === undefined) {
				nextInfo = {
					minAvailableModules: undefined,
					availableModulesToBeMerged: []
				};
				chunkGroupInfoMap.set(nextChunkGroup, nextInfo);
			}
			nextInfo.availableModulesToBeMerged.push(newAvailableModules);

			// As queue deduplicates enqueued items this makes sure that a ChunkGroup
			// is not enqueued twice
			queue2.enqueue(nextChunkGroup);
		}
	}

	// Remove all unconnected chunk groups
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

module.exports = buildChunkGraph;
