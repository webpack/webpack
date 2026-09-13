/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");

/** @import Chunk from "../Chunk" */
/** @import ChunkGraph from "../ChunkGraph" */
/** @import RuntimeModule from "../RuntimeModule" */

// Every character the regexp grammar gives a meaning to, so a global naming one is
// matched literally rather than reinterpreted — a lone `\` included.
const REGEXP_META = /[.*+?^${}()|[\]\\]/g;

// An assignment onto any handler map hanging off the require global, as the modules
// installing one emit it: `__webpack_require__.<map>.<key> =`.
const MAP_ASSIGNMENT = new RegExp(
	`${RuntimeGlobals.require.replace(REGEXP_META, "\\$&")}\\.([\\w$]+)\\.([\\w$]+)\\s*=`,
	"g"
);

/** @type {WeakMap<Chunk, Map<string, string | null>>} */
const chunkHandlerKeys = new WeakMap();

/**
 * Reads a sibling's code without caching output that is not final yet: a module
 * keyed on a hash renders a placeholder until the hash exists, so `getGeneratedCode`
 * would pin that placeholder, while `generate` throws it away.
 * @param {RuntimeModule} runtimeModule the module to read
 * @returns {string | null} the generated code, or `null` when it cannot be read
 */
const readCode = (runtimeModule) => {
	try {
		return runtimeModule.fullHash || runtimeModule.dependentHash
			? runtimeModule.generate()
			: runtimeModule.getGeneratedCode();
	} catch (_err) {
		// A module that cannot render is reported where it renders itself; here it
		// only means the answer is unknown, which the general dispatch covers.
		return null;
	}
};

/**
 * Reads every handler key a chunk's runtime modules install, mapping each handler
 * map to its sole key or to `null` where several modules install onto it.
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Chunk} chunk the chunk to scan
 * @returns {Map<string, string | null>} the sole key per handler map
 */
const scanChunk = (chunkGraph, chunk) => {
	/** @type {Map<string, string | null>} */
	const keys = new Map();
	/**
	 * @param {string} map the handler map global
	 * @param {string} key the handler key
	 * @returns {void}
	 */
	const record = (map, key) => {
		const previous = keys.get(map);
		keys.set(map, previous === undefined || previous === key ? key : null);
	};
	for (const module of chunkGraph.getChunkRuntimeModulesIterable(chunk)) {
		// A module that reads a map rather than installing onto one would generate in
		// a cycle, and it installs nothing the scan needs.
		if (module._dispatchesChunkHandlers) continue;
		// Stating what it installs spares reading it, which for a module keyed on a
		// hash means rendering it a second time.
		const declared = module._installedChunkHandlers;
		if (declared !== undefined) {
			for (const [map, key] of declared) record(map, key);
			continue;
		}
		const code = readCode(module);
		if (code === null) continue;
		MAP_ASSIGNMENT.lastIndex = 0;
		let match;
		while ((match = MAP_ASSIGNMENT.exec(code)) !== null) {
			record(`${RuntimeGlobals.require}.${match[1]}`, match[2]);
		}
	}
	return keys;
};

/**
 * The one key a chunk's other runtime modules install on a handler map, or `null`
 * when they install several — read from what they emit, so a handler added later is
 * counted without being declared anywhere. A map that does not hang off the require
 * global is never specialized, which the general dispatch covers.
 * @param {RuntimeModule} runtimeModule the runtime module rendering the dispatch
 * @param {string} handlers the handler map global
 * @returns {string | null} the sole handler key, or `null`
 */
const getOnlyHandlerKey = (runtimeModule, handlers) => {
	const chunkGraph = /** @type {ChunkGraph | undefined} */ (
		runtimeModule.chunkGraph
	);
	const chunk = /** @type {Chunk | undefined} */ (runtimeModule.chunk);
	if (chunkGraph === undefined || chunk === undefined) return null;
	// The scan reads every sibling once, so the maps a chunk's other dispatchers ask
	// about later cost nothing to answer.
	let keys = chunkHandlerKeys.get(chunk);
	if (keys === undefined) {
		keys = scanChunk(chunkGraph, chunk);
		chunkHandlerKeys.set(chunk, keys);
	}
	const only = keys.get(handlers);
	return only === undefined ? null : only;
};

module.exports.getOnlyHandlerKey = getOnlyHandlerKey;
