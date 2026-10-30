/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const RuntimeModule = require("../runtime/RuntimeModule");
const Template = require("../template/Template");
const { getLoadedChunks, getStandInChunk } = require("./chunkGroupStandIn");

/** @import Compilation from "../Compilation" */
/** @import Chunk, { ChunkId } from "../graph/Chunk" */

const HANDLER_KEY = "group";

/**
 * Loads the other chunks of an async chunk group when HMR code asks for its last one,
 * so `import()` stays the same when the group's chunks change.
 */
class HotModuleReplacementChunkGroupRuntimeModule extends RuntimeModule {
	/**
	 * Creates an instance of HotModuleReplacementChunkGroupRuntimeModule.
	 */
	constructor() {
		// Before the chunk loaders, so the other chunks' stylesheets are inserted first.
		super("hot module replacement chunk groups", RuntimeModule.STAGE_BASIC);
	}

	/**
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		return [[RuntimeGlobals.ensureChunkHandlers, HANDLER_KEY]];
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		/** @type {Map<ChunkId, Set<ChunkId>>} */
		const siblingsByChunkId = new Map();
		for (const chunk of /** @type {Chunk} */ (this.chunk).getAllAsyncChunks()) {
			for (const chunkGroup of chunk.groupsIterable) {
				if (chunkGroup.isInitial()) continue;
				// The same chunks `RuntimeTemplate#blockPromise` loads, one for all.
				const chunks = getLoadedChunks(chunkGroup);
				if (chunks.length < 2) continue;
				const standIn = getStandInChunk(chunkGroup);
				if (standIn === undefined) continue;
				const standInId = /** @type {ChunkId} */ (standIn.id);
				if (siblingsByChunkId.has(standInId)) continue;
				/** @type {Set<ChunkId>} */
				const siblings = new Set();
				for (const sibling of chunks) {
					if (sibling !== standIn) {
						siblings.add(/** @type {ChunkId} */ (sibling.id));
					}
				}
				siblingsByChunkId.set(standInId, siblings);
			}
		}
		/** @type {Record<ChunkId, ChunkId[]>} */
		const map = Object.create(null);
		for (const [chunkId, siblings] of siblingsByChunkId) {
			map[chunkId] = [...siblings];
		}
		// Without a group to load, clearing the map is enough: a handler installed by
		// an earlier build then finds no siblings.
		if (siblingsByChunkId.size === 0) {
			return `${RuntimeGlobals.hmrChunkGroups} = { __proto__: null };`;
		}
		const handlers = RuntimeGlobals.ensureChunkHandlers;
		return Template.asString([
			// No prototype, so a chunk id like `toString` reads no inherited member.
			`${RuntimeGlobals.hmrChunkGroups} = { __proto__: null, ${JSON.stringify(map).slice(1, -1)} };`,
			// A hot update re-runs this module to install the handler with the new map.
			`${handlers}.${HANDLER_KEY} = ${runtimeTemplate.basicFunction(
				"chunkId, promises, fetchPriority",
				[
					`${runtimeTemplate.renderConst()} siblings = ${RuntimeGlobals.hmrChunkGroups}[chunkId];`,
					"if (!siblings) return;",
					`${runtimeTemplate.renderConst()} keys = Object.keys(${handlers}).filter(${runtimeTemplate.returningFunction(
						`key !== ${JSON.stringify(HANDLER_KEY)}`,
						"key"
					)});`,
					`siblings.forEach(${runtimeTemplate.basicFunction("id", [
						`keys.forEach(${runtimeTemplate.basicFunction(
							"key",
							`${handlers}[key](id, promises, fetchPriority);`
						)});`
					])});`
				]
			)};`
		]);
	}
}

module.exports = HotModuleReplacementChunkGroupRuntimeModule;
