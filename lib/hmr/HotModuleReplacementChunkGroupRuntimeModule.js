/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const RuntimeModule = require("../runtime/RuntimeModule");
const Template = require("../template/Template");

/** @import Compilation from "../Compilation" */
/** @import Chunk, { ChunkId } from "../graph/Chunk" */

const HANDLER_KEY = "group";

/**
 * Loads the other chunks of an async chunk group when HMR code asks for its last one,
 * so `import()` stays the same when the group's chunks change.
 */
class HotModuleReplacementChunkGroupRuntimeModule extends RuntimeModule {
	constructor() {
		super("hot module replacement chunk groups", RuntimeModule.STAGE_TRIGGER);
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
				// The same chunks `RuntimeTemplate#blockPromise` loads, the last one for all.
				const chunks = chunkGroup.chunks.filter(
					(chunk) => !chunk.hasRuntime() && chunk.id !== null
				);
				if (chunks.length < 2) continue;
				const last = /** @type {ChunkId} */ (chunks[chunks.length - 1].id);
				let siblings = siblingsByChunkId.get(last);
				if (siblings === undefined) {
					siblings = new Set();
					siblingsByChunkId.set(last, siblings);
				}
				for (let i = 0; i < chunks.length - 1; i++) {
					siblings.add(/** @type {ChunkId} */ (chunks[i].id));
				}
			}
		}
		/** @type {Record<ChunkId, ChunkId[]>} */
		const map = {};
		for (const [chunkId, siblings] of siblingsByChunkId) {
			map[chunkId] = [...siblings];
		}
		const handlers = RuntimeGlobals.ensureChunkHandlers;
		return Template.asString([
			`var chunkGroups = ${JSON.stringify(map)};`,
			// A hot update re-runs this module to install the handler with the new map.
			`${handlers}.${HANDLER_KEY} = ${runtimeTemplate.basicFunction(
				"chunkId, promises, fetchPriority",
				[
					"var siblings = chunkGroups[chunkId];",
					`if (siblings) siblings.forEach(${runtimeTemplate.basicFunction(
						"id",
						[
							`Object.keys(${handlers}).forEach(${runtimeTemplate.basicFunction(
								"key",
								[
									`if (key !== ${JSON.stringify(HANDLER_KEY)}) ${handlers}[key](id, promises, fetchPriority);`
								]
							)});`
						]
					)});`
				]
			)};`
		]);
	}
}

module.exports = HotModuleReplacementChunkGroupRuntimeModule;
