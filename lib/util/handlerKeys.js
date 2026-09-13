/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @import Chunk from "../Chunk" */
/** @import ChunkGraph from "../ChunkGraph" */
/** @import RuntimeModule from "../RuntimeModule" */

/** @type {Map<string, RegExp>} */
const assignmentCache = new Map();

// Every character the regexp grammar gives a meaning to, so a global naming one is
// matched literally rather than reinterpreted — a lone `\` included.
const REGEXP_META = /[.*+?^${}()|[\]\\]/g;

/**
 * Matches an assignment onto a handler map, as the modules installing one emit it.
 * @param {string} handlers the handler map global
 * @returns {RegExp} a global regexp capturing the handler key
 */
const assignmentRegExp = (handlers) => {
	const cached = assignmentCache.get(handlers);
	if (cached !== undefined) return cached;
	const regExp = new RegExp(
		`${handlers.replace(REGEXP_META, "\\$&")}\\.([\\w$]+)\\s*=`,
		"g"
	);
	assignmentCache.set(handlers, regExp);
	return regExp;
};

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
 * The one key a chunk's other runtime modules install on a handler map, or `null`
 * when they install several — read from what they emit, so a handler added later is
 * counted without being declared anywhere.
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
	const regExp = assignmentRegExp(handlers);
	/** @type {string | null} */
	let only = null;
	for (const module of chunkGraph.getChunkRuntimeModulesIterable(chunk)) {
		if (module === runtimeModule || module._dispatchesChunkHandlers) continue;
		const code = readCode(module);
		if (code === null) continue;
		regExp.lastIndex = 0;
		let match;
		while ((match = regExp.exec(code)) !== null) {
			if (only !== null && only !== match[1]) return null;
			only = match[1];
		}
	}
	return only;
};

module.exports.getOnlyHandlerKey = getOnlyHandlerKey;
