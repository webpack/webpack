/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependencyToInitialChunkError = require("./AsyncDependencyToInitialChunkError");
const { connectChunkGroupParentAndChild } = require("./GraphHelpers");
const ModuleGraphConnection = require("./ModuleGraphConnection");
const { getEntryRuntime, mergeRuntime } = require("./util/runtime");

/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./Entrypoint")} Entrypoint */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("./logging/Logger").Logger} Logger */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */

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
 * @property {RuntimeSpec} runtime the runtimes
 * @property {ModuleSetPlus | undefined} minAvailableModules current minimal set of modules available at this point
 * @property {boolean | undefined} minAvailableModulesOwned true, if minAvailableModules is owned and can be modified
 * @property {ModuleSetPlus[]} availableModulesToBeMerged enqueued updates to the minimal set of available modules
 * @property {Set<Module>=} skippedItems modules that were skipped because module is already available in parent chunks (need to reconsider when minAvailableModules is shrinking)
 * @property {Set<[Module, ModuleGraphConnection[]]>=} skippedModuleConnections referenced modules that where skipped because they were not active in this runtime
 * @property {ModuleSetPlus | undefined} resultingAvailableModules set of modules available including modules from this chunk group
 * @property {Set<ChunkGroupInfo> | undefined} children set of children chunk groups, that will be revisited when availableModules shrink
 * @property {Set<ChunkGroupInfo> | undefined} availableSources set of chunk groups that are the source for minAvailableModules
 * @property {Set<ChunkGroupInfo> | undefined} availableChildren set of chunk groups which depend on the this chunk group as availableSource
 * @property {number} preOrderIndex next pre order index
 * @property {number} postOrderIndex next post order index
 * @property {boolean} chunkLoading has a chunk loading mechanism
 * @property {boolean} asyncChunks create async chunks
 */

/**
 * @typedef {Object} BlockChunkGroupConnection
 * @property {ChunkGroupInfo} originChunkGroupInfo origin chunk group
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
 * @param {ModuleGraphConnection[]} connections list of connections
 * @param {RuntimeSpec} runtime for which runtime
 * @returns {ConnectionState} connection state
 */
const getActiveStateOfConnections = (connections, runtime) => {
	let merged = connections[0].getActiveState(runtime);
	if (merged === true) return true;
	for (let i = 1; i < connections.length; i++) {
		const c = connections[i];
		merged = ModuleGraphConnection.addConnectionStates(
			merged,
			c.getActiveState(runtime)
		);
		if (merged === true) return true;
	}
	return merged;
};

const extractBlockModules = (module, moduleGraph, runtime, blockModulesMap) => {
	let blockCache;
	let modules;

	const arrays = [];

	const queue = [module];
	while (queue.length > 0) {
		const block = queue.pop();
		const arr = [];
		arrays.push(arr);
		blockModulesMap.set(block, arr);
		for (const b of block.blocks) {
			queue.push(b);
		}
	}

	for (const connection of moduleGraph.getOutgoingConnections(module)) {
		const d = connection.dependency;
		// We skip connections without dependency
		if (!d) continue;
		const m = connection.module;
		// We skip connections without Module pointer
		if (!m) continue;
		// We skip weak connections
		if (connection.weak) continue;

		const block = moduleGraph.getParentBlock(d);
		let index = moduleGraph.getParentBlockIndex(d);

		// deprecated fallback
		if (index < 0) {
			index = block.dependencies.indexOf(d);
		}

		if (blockCache !== block) {
			modules = blockModulesMap.get((blockCache = block));
		}

		const i = index * 3;
		modules[i] = m;
		modules[i + 1] = connection.getActiveState(runtime);
		modules[i + 2] = connection;
	}

	for (const modules of arrays) {
		if (modules.length === 0) continue;
		let indexMap;
		let length = 0;
		outer: for (let j = 0; j < modules.length; j += 3) {
			const m = modules[j];
			if (m === undefined) continue;
			const state = modules[j + 1];
			const connection = modules[j + 2];
			if (indexMap === undefined) {
				let i = 0;
				for (; i < length; i += 3) {
					if (modules[i] === m) {
						const merged = modules[i + 1];
						modules[i + 2].push(connection);
						if (merged === true) continue outer;
						modules[i + 1] = ModuleGraphConnection.addConnectionStates(
							merged,
							state
						);
						continue outer;
					}
				}
				modules[length] = m;
				length++;
				modules[length] = state;
				length++;
				modules[length] = [connection];
				length++;
				if (length > 30) {
					// To avoid worse case performance, we will use an index map for
					// linear cost access, which allows to maintain O(n) complexity
					// while keeping allocations down to a minimum
					indexMap = new Map();
					for (let i = 0; i < length; i += 3) {
						indexMap.set(modules[i], i + 1);
					}
				}
			} else {
				const idx = indexMap.get(m);
				if (idx !== undefined) {
					const merged = modules[idx];
					modules[idx + 1].push(connection);
					if (merged === true) continue outer;
					modules[idx] = ModuleGraphConnection.addConnectionStates(
						merged,
						state
					);
				} else {
					modules[length] = m;
					length++;
					modules[length] = state;
					indexMap.set(m, length);
					length++;
					modules[length] = [connection];
					length++;
				}
			}
		}
		modules.length = length;
	}
};

/**
 *
 * @param {Logger} logger a logger
 * @param {Compilation} compilation the compilation
 * @param {Map<Entrypoint, Module[]>} inputEntrypointsAndModules chunk groups which are processed with the modules
 * @param {Map<ChunkGroup, ChunkGroupInfo>} chunkGroupInfoMap mapping from chunk group to available modules
 * @param {Map<AsyncDependenciesBlock, BlockChunkGroupConnection[]>} blockConnections connection for blocks
 * @param {Set<DependenciesBlock>} blocksWithNestedBlocks flag for blocks that have nested blocks
 * @param {Set<ChunkGroup>} allCreatedChunkGroups filled with all chunk groups that are created here
 */
const visitModules = (
	logger,
	compilation,
	inputEntrypointsAndModules,
	chunkGroupInfoMap,
	blockConnections,
	blocksWithNestedBlocks,
	allCreatedChunkGroups
) => {
	const { moduleGraph, chunkGraph, moduleMemCaches } = compilation;

	const blockModulesRuntimeMap = new Map();

	/** @type {RuntimeSpec | false} */
	let blockModulesMapRuntime = false;
	/** @type {Map<DependenciesBlock, (Module | ConnectionState)[]>} */
	let blockModulesMap;

	/**
	 *
	 * @param {DependenciesBlock} block block
	 * @param {RuntimeSpec} runtime runtime
	 * @returns {(Module | ConnectionState | ModuleGraphConnection[])[]} block modules in flatten tuples
	 */
	const getBlockModules = (block, runtime) => {
		if (blockModulesMapRuntime !== runtime) {
			blockModulesMap = blockModulesRuntimeMap.get(runtime);
			if (blockModulesMap === undefined) {
				blockModulesMap = new Map();
				blockModulesRuntimeMap.set(runtime, blockModulesMap);
			}
		}
		let blockModules = blockModulesMap.get(block);
		if (blockModules !== undefined) return blockModules;
		const module = /** @type {Module} */ (block.getRootBlock());
		const memCache = moduleMemCaches && moduleMemCaches.get(module);
		if (memCache !== undefined) {
			const map = memCache.provide(
				"bundleChunkGraph.blockModules",
				runtime,
				() => {
					logger.time("visitModules: prepare");
					const map = new Map();
					extractBlockModules(module, moduleGraph, runtime, map);
					logger.timeAggregate("visitModules: prepare");
					return map;
				}
			);
			for (const [block, blockModules] of map)
				blockModulesMap.set(block, blockModules);
			return map.get(block);
		} else {
			logger.time("visitModules: prepare");
			extractBlockModules(module, moduleGraph, runtime, blockModulesMap);
			blockModules = blockModulesMap.get(block);
			logger.timeAggregate("visitModules: prepare");
			return /** @type {(Module | ConnectionState)[]} */ (blockModules);
		}
	};

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

	/** @type {Map<ChunkGroupInfo, DependenciesBlock>} */
	const blockByChunkGroups = new Map();

	/** @type {Map<string, ChunkGroupInfo>} */
	const namedChunkGroups = new Map();

	/** @type {Map<string, ChunkGroupInfo>} */
	const namedAsyncEntrypoints = new Map();

	/** @type {Set<ChunkGroupInfo>} */
	const outdatedOrderIndexChunkGroups = new Set();

	const ADD_AND_ENTER_ENTRY_MODULE = 0;
	const ADD_AND_ENTER_MODULE = 1;
	const ENTER_MODULE = 2;
	const PROCESS_BLOCK = 3;
	const PROCESS_ENTRY_BLOCK = 4;
	const LEAVE_MODULE = 5;

	/** @type {QueueItem[]} */
	let queue = [];

	/** @type {Map<ChunkGroupInfo, Set<ChunkGroupInfo>>} */
	const queueConnect = new Map();
	/** @type {Set<ChunkGroupInfo>} */
	const chunkGroupsForCombining = new Set();

	// Fill queue with entrypoint modules
	// Create ChunkGroupInfo for entrypoints
	for (const [chunkGroup, modules] of inputEntrypointsAndModules) {
		const runtime = getEntryRuntime(
			compilation,
			/** @type {string} */ (chunkGroup.name),
			chunkGroup.options
		);
		/** @type {ChunkGroupInfo} */
		const chunkGroupInfo = {
			chunkGroup,
			runtime,
			minAvailableModules: undefined,
			minAvailableModulesOwned: false,
			availableModulesToBeMerged: [],
			skippedItems: undefined,
			resultingAvailableModules: undefined,
			children: undefined,
			availableSources: undefined,
			availableChildren: undefined,
			preOrderIndex: 0,
			postOrderIndex: 0,
			chunkLoading:
				chunkGroup.options.chunkLoading !== undefined
					? chunkGroup.options.chunkLoading !== false
					: compilation.outputOptions.chunkLoading !== false,
			asyncChunks:
				chunkGroup.options.asyncChunks !== undefined
					? chunkGroup.options.asyncChunks
					: compilation.outputOptions.asyncChunks !== false
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
			const parentChunkGroupInfo =
				/** @type {ChunkGroupInfo} */
				(chunkGroupInfoMap.get(parent));
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

	/** @type {[Module, ModuleGraphConnection[]][]} */
	const skipConnectionBuffer = [];
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
		/** @type {ChunkGroup | undefined} */
		let c;
		/** @type {Entrypoint | undefined} */
		let entrypoint;
		const entryOptions = b.groupOptions && b.groupOptions.entryOptions;
		if (cgi === undefined) {
			const chunkName = (b.groupOptions && b.groupOptions.name) || b.chunkName;
			if (entryOptions) {
				cgi = namedAsyncEntrypoints.get(/** @type {string} */ (chunkName));
				if (!cgi) {
					entrypoint = compilation.addAsyncEntrypoint(
						entryOptions,
						module,
						b.loc,
						b.request
					);
					entrypoint.index = nextChunkGroupIndex++;
					cgi = {
						chunkGroup: entrypoint,
						runtime: entrypoint.options.runtime || entrypoint.name,
						minAvailableModules: EMPTY_SET,
						minAvailableModulesOwned: false,
						availableModulesToBeMerged: [],
						skippedItems: undefined,
						resultingAvailableModules: undefined,
						children: undefined,
						availableSources: undefined,
						availableChildren: undefined,
						preOrderIndex: 0,
						postOrderIndex: 0,
						chunkLoading:
							entryOptions.chunkLoading !== undefined
								? entryOptions.chunkLoading !== false
								: chunkGroupInfo.chunkLoading,
						asyncChunks:
							entryOptions.asyncChunks !== undefined
								? entryOptions.asyncChunks
								: chunkGroupInfo.asyncChunks
					};
					chunkGroupInfoMap.set(entrypoint, cgi);

					chunkGraph.connectBlockAndChunkGroup(b, entrypoint);
					if (chunkName) {
						namedAsyncEntrypoints.set(chunkName, cgi);
					}
				} else {
					entrypoint = /** @type {Entrypoint} */ (cgi.chunkGroup);
					// TODO merge entryOptions
					entrypoint.addOrigin(module, b.loc, b.request);
					chunkGraph.connectBlockAndChunkGroup(b, entrypoint);
				}

				// 2. We enqueue the DependenciesBlock for traversal
				queueDelayed.push({
					action: PROCESS_ENTRY_BLOCK,
					block: b,
					module: module,
					chunk: entrypoint.chunks[0],
					chunkGroup: entrypoint,
					chunkGroupInfo: cgi
				});
			} else if (!chunkGroupInfo.asyncChunks || !chunkGroupInfo.chunkLoading) {
				// Just queue the block into the current chunk group
				queue.push({
					action: PROCESS_BLOCK,
					block: b,
					module: module,
					chunk,
					chunkGroup,
					chunkGroupInfo
				});
			} else {
				cgi = chunkName && namedChunkGroups.get(chunkName);
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
						runtime: chunkGroupInfo.runtime,
						minAvailableModules: undefined,
						minAvailableModulesOwned: undefined,
						availableModulesToBeMerged: [],
						skippedItems: undefined,
						resultingAvailableModules: undefined,
						children: undefined,
						availableSources: undefined,
						availableChildren: undefined,
						preOrderIndex: 0,
						postOrderIndex: 0,
						chunkLoading: chunkGroupInfo.chunkLoading,
						asyncChunks: chunkGroupInfo.asyncChunks
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
							new AsyncDependencyToInitialChunkError(
								/** @type {string} */ (chunkName),
								module,
								b.loc
							)
						);
						c = chunkGroup;
					} else {
						c.addOptions(b.groupOptions);
					}
					c.addOrigin(module, b.loc, b.request);
				}
				blockConnections.set(b, []);
			}
			blockChunkGroups.set(b, /** @type {ChunkGroupInfo} */ (cgi));
			blockByChunkGroups.set(cgi, b);
		} else if (entryOptions) {
			entrypoint = /** @type {Entrypoint} */ (cgi.chunkGroup);
		} else {
			c = cgi.chunkGroup;
		}

		if (c !== undefined) {
			// 2. We store the connection for the block
			// to connect it later if needed
			blockConnections.get(b).push({
				originChunkGroupInfo: chunkGroupInfo,
				chunkGroup: c
			});

			// 3. We enqueue the chunk group info creation/updating
			let connectList = queueConnect.get(chunkGroupInfo);
			if (connectList === undefined) {
				connectList = new Set();
				queueConnect.set(chunkGroupInfo, connectList);
			}
			connectList.add(/** @type {ChunkGroupInfo} */ (cgi));

			// TODO check if this really need to be done for each traversal
			// or if it is enough when it's queued when created
			// 4. We enqueue the DependenciesBlock for traversal
			queueDelayed.push({
				action: PROCESS_BLOCK,
				block: b,
				module: module,
				chunk: c.chunks[0],
				chunkGroup: c,
				chunkGroupInfo: /** @type {ChunkGroupInfo} */ (cgi)
			});
		} else if (entrypoint !== undefined) {
			chunkGroupInfo.chunkGroup.addAsyncEntrypoint(entrypoint);
		}
	};

	/**
	 * @param {DependenciesBlock} block the block
	 * @returns {void}
	 */
	const processBlock = block => {
		statProcessedBlocks++;
		// get prepared block info
		const blockModules = getBlockModules(block, chunkGroupInfo.runtime);

		if (blockModules !== undefined) {
			const { minAvailableModules } = chunkGroupInfo;
			// Buffer items because order need to be reversed to get indices correct
			// Traverse all referenced modules
			for (let i = 0; i < blockModules.length; i += 3) {
				const refModule = /** @type {Module} */ (blockModules[i]);
				if (chunkGraph.isModuleInChunk(refModule, chunk)) {
					// skip early if already connected
					continue;
				}
				const activeState = /** @type {ConnectionState} */ (
					blockModules[i + 1]
				);
				if (activeState !== true) {
					const connections = /** @type {ModuleGraphConnection[]} */ (
						blockModules[i + 2]
					);
					skipConnectionBuffer.push([refModule, connections]);
					// We skip inactive connections
					if (activeState === false) continue;
				}
				if (
					activeState === true &&
					(minAvailableModules.has(refModule) ||
						minAvailableModules.plus.has(refModule))
				) {
					// already in parent chunks, skip it for now
					skipBuffer.push(refModule);
					continue;
				}
				// enqueue, then add and enter to be in the correct order
				// this is relevant with circular dependencies
				queueBuffer.push({
					action: activeState === true ? ADD_AND_ENTER_MODULE : PROCESS_BLOCK,
					block: refModule,
					module: refModule,
					chunk,
					chunkGroup,
					chunkGroupInfo
				});
			}
			// Add buffered items in reverse order
			if (skipConnectionBuffer.length > 0) {
				let { skippedModuleConnections } = chunkGroupInfo;
				if (skippedModuleConnections === undefined) {
					chunkGroupInfo.skippedModuleConnections = skippedModuleConnections =
						new Set();
				}
				for (let i = skipConnectionBuffer.length - 1; i >= 0; i--) {
					skippedModuleConnections.add(skipConnectionBuffer[i]);
				}
				skipConnectionBuffer.length = 0;
			}
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
			iteratorBlock(b);
		}

		if (block.blocks.length > 0 && module !== block) {
			blocksWithNestedBlocks.add(block);
		}
	};

	/**
	 * @param {DependenciesBlock} block the block
	 * @returns {void}
	 */
	const processEntryBlock = block => {
		statProcessedBlocks++;
		// get prepared block info
		const blockModules = getBlockModules(block, chunkGroupInfo.runtime);

		if (blockModules !== undefined) {
			// Traverse all referenced modules
			for (let i = 0; i < blockModules.length; i += 3) {
				const refModule = /** @type {Module} */ (blockModules[i]);
				const activeState = /** @type {ConnectionState} */ (
					blockModules[i + 1]
				);
				// enqueue, then add and enter to be in the correct order
				// this is relevant with circular dependencies
				queueBuffer.push({
					action:
						activeState === true ? ADD_AND_ENTER_ENTRY_MODULE : PROCESS_BLOCK,
					block: refModule,
					module: refModule,
					chunk,
					chunkGroup,
					chunkGroupInfo
				});
			}
			// Add buffered items in reverse order
			if (queueBuffer.length > 0) {
				for (let i = queueBuffer.length - 1; i >= 0; i--) {
					queue.push(queueBuffer[i]);
				}
				queueBuffer.length = 0;
			}
		}

		// Traverse all Blocks
		for (const b of block.blocks) {
			iteratorBlock(b);
		}

		if (block.blocks.length > 0 && module !== block) {
			blocksWithNestedBlocks.add(block);
		}
	};

	const processQueue = () => {
		while (queue.length) {
			statProcessedQueueItems++;
			const queueItem = /** @type {QueueItem} */ (queue.pop());
			module = queueItem.module;
			block = queueItem.block;
			chunk = queueItem.chunk;
			chunkGroup = queueItem.chunkGroup;
			chunkGroupInfo = queueItem.chunkGroupInfo;

			switch (queueItem.action) {
				case ADD_AND_ENTER_ENTRY_MODULE:
					chunkGraph.connectChunkAndEntryModule(
						chunk,
						module,
						/** @type {Entrypoint} */ (chunkGroup)
					);
				// fallthrough
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
				case PROCESS_ENTRY_BLOCK: {
					processEntryBlock(block);
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
			resultingAvailableModules =
				/** @type {Set<Module> & {plus: Set<Module>}} */ (new Set());
			for (const module of minAvailableModules.plus)
				minAvailableModules.add(module);
			minAvailableModules.plus = EMPTY_SET;
			resultingAvailableModules.plus = minAvailableModules;
			chunkGroupInfo.minAvailableModulesOwned = false;
		} else {
			// resultingAvailableModules = (minAvailableModules + modules of chunk) + (minAvailableModules.plus)
			resultingAvailableModules =
				/** @type {Set<Module> & {plus: Set<Module>}} */ (
					new Set(minAvailableModules)
				);
			resultingAvailableModules.plus = minAvailableModules.plus;
		}

		// add the modules from the chunk group to the set
		for (const chunk of chunkGroupInfo.chunkGroup.chunks) {
			for (const m of chunkGraph.getChunkModulesIterable(chunk)) {
				resultingAvailableModules.add(m);
			}
		}
		return (chunkGroupInfo.resultingAvailableModules =
			resultingAvailableModules);
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
			const resultingAvailableModules =
				calculateResultingAvailableModules(chunkGroupInfo);

			const runtime = chunkGroupInfo.runtime;

			// 3. Update chunk group info
			for (const target of targets) {
				target.availableModulesToBeMerged.push(resultingAvailableModules);
				chunkGroupsForMerging.add(target);
				const oldRuntime = target.runtime;
				const newRuntime = mergeRuntime(oldRuntime, runtime);
				if (oldRuntime !== newRuntime) {
					target.runtime = newRuntime;
					outdatedChunkGroupInfo.add(target);
				}
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
									const iterator =
										cachedMinAvailableModules.plus[Symbol.iterator]();
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
											availableModules.plus.has(module)
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
								const newSet = /** @type {ModuleSetPlus} */ (
									new Set(cachedMinAvailableModules)
								);
								newSet.plus = EMPTY_SET;
								const iterator =
									cachedMinAvailableModules.plus[Symbol.iterator]();
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
		for (const info of chunkGroupsForCombining) {
			for (const source of /** @type {Set<ChunkGroupInfo>} */ (
				info.availableSources
			)) {
				if (!source.minAvailableModules) {
					chunkGroupsForCombining.delete(info);
					break;
				}
			}
		}
		for (const info of chunkGroupsForCombining) {
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
			for (const source of /** @type {Set<ChunkGroupInfo>} */ (
				info.availableSources
			)) {
				const resultingAvailableModules =
					calculateResultingAvailableModules(source);
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
				const minAvailableModules =
					/** @type {ModuleSetPlus} */
					(info.minAvailableModules);
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

			// 2. Reconsider skipped connections
			if (info.skippedModuleConnections !== undefined) {
				const minAvailableModules =
					/** @type {ModuleSetPlus} */
					(info.minAvailableModules);
				for (const entry of info.skippedModuleConnections) {
					const [module, connections] = entry;
					const activeState = getActiveStateOfConnections(
						connections,
						info.runtime
					);
					if (activeState === false) continue;
					if (activeState === true) {
						info.skippedModuleConnections.delete(entry);
					}
					if (
						activeState === true &&
						(minAvailableModules.has(module) ||
							minAvailableModules.plus.has(module))
					) {
						info.skippedItems.add(module);
						continue;
					}
					queue.push({
						action: activeState === true ? ADD_AND_ENTER_MODULE : PROCESS_BLOCK,
						block: module,
						module,
						chunk: info.chunkGroup.chunks[0],
						chunkGroup: info.chunkGroup,
						chunkGroupInfo: info
					});
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
			outdatedOrderIndexChunkGroups.add(info);
		}
		outdatedChunkGroupInfo.clear();
	};

	// Iterative traversal of the Module graph
	// Recursive would be simpler to write but could result in Stack Overflows
	while (queue.length || queueConnect.size) {
		logger.time("visitModules: visiting");
		processQueue();
		logger.timeAggregateEnd("visitModules: prepare");
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

	for (const info of outdatedOrderIndexChunkGroups) {
		const { chunkGroup, runtime } = info;

		const block = blockByChunkGroups.get(info);

		if (!block) {
			continue;
		}

		let preOrderIndex = 0;
		let postOrderIndex = 0;

		const process = (current, visited = new Set()) => {
			if (visited.has(current)) {
				return;
			}

			visited.add(current);

			const blockModules = getBlockModules(current, runtime);
			if (blockModules === undefined) {
				return;
			}

			for (let i = 0; i < blockModules.length; i += 3) {
				const refModule = /** @type {Module} */ (blockModules[i]);
				const activeState = /** @type {ConnectionState} */ (
					blockModules[i + 1]
				);
				if (activeState === false) {
					continue;
				}

				if (refModule) {
					chunkGroup.setModulePreOrderIndex(refModule, preOrderIndex++);
					process(refModule, visited);
					chunkGroup.setModulePostOrderIndex(refModule, postOrderIndex++);
				}
			}
		};

		process(block);
	}
	outdatedOrderIndexChunkGroups.clear();

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
 * @param {Map<AsyncDependenciesBlock, BlockChunkGroupConnection[]>} blockConnections connection for blocks
 * @param {Map<ChunkGroup, ChunkGroupInfo>} chunkGroupInfoMap mapping from chunk group to available modules
 */
const connectChunkGroups = (
	compilation,
	blocksWithNestedBlocks,
	blockConnections,
	chunkGroupInfoMap
) => {
	const { chunkGraph } = compilation;

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
	for (const [block, connections] of blockConnections) {
		// 1. Check if connection is needed
		// When none of the dependencies need to be connected
		// we can skip all of them
		// It's not possible to filter each item so it doesn't create inconsistent
		// connections and modules can only create one version
		// TODO maybe decide this per runtime
		if (
			// TODO is this needed?
			!blocksWithNestedBlocks.has(block) &&
			connections.every(({ chunkGroup, originChunkGroupInfo }) =>
				areModulesAvailable(
					chunkGroup,
					originChunkGroupInfo.resultingAvailableModules
				)
			)
		) {
			continue;
		}

		// 2. Foreach edge
		for (let i = 0; i < connections.length; i++) {
			const { chunkGroup, originChunkGroupInfo } = connections[i];

			// 3. Connect block with chunk
			chunkGraph.connectBlockAndChunkGroup(block, chunkGroup);

			// 4. Connect chunk with parent
			connectChunkGroupParentAndChild(
				originChunkGroupInfo.chunkGroup,
				chunkGroup
			);
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

	/** @type {Map<AsyncDependenciesBlock, BlockChunkGroupConnection[]>} */
	const blockConnections = new Map();

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
		blockConnections,
		blocksWithNestedBlocks,
		allCreatedChunkGroups
	);
	logger.timeEnd("visitModules");

	// PART TWO

	logger.time("connectChunkGroups");
	connectChunkGroups(
		compilation,
		blocksWithNestedBlocks,
		blockConnections,
		chunkGroupInfoMap
	);
	logger.timeEnd("connectChunkGroups");

	for (const [chunkGroup, chunkGroupInfo] of chunkGroupInfoMap) {
		for (const chunk of chunkGroup.chunks)
			chunk.runtime = mergeRuntime(chunk.runtime, chunkGroupInfo.runtime);
	}

	// Cleanup work

	logger.time("cleanup");
	cleanupUnconnectedGroups(compilation, allCreatedChunkGroups);
	logger.timeEnd("cleanup");
};

module.exports = buildChunkGraph;
