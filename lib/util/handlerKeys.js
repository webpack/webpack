/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");

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

/**
 * Reads a module that states nothing, without caching output that is not final yet:
 * one keyed on a hash renders a placeholder until the hash exists, which
 * `getGeneratedCode` would pin and `generate` throws away.
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
 * The one key a chunk's runtime modules install on a handler map, or `null` when
 * they install several, none, or one they cannot name. A module states what it
 * installs; one that states nothing is read, so a third-party handler still counts.
 * @param {RuntimeModule} runtimeModule the runtime module rendering the dispatch
 * @param {string} handlers the handler map global
 * @returns {string | null} the sole handler key, or `null`
 */
const getOnlyHandlerKey = (runtimeModule, handlers) => {
	const { chunkGraph, chunk } = runtimeModule;
	if (chunkGraph === undefined || chunk === undefined) return null;
	/** @type {string | null} */
	let only = null;
	/**
	 * @param {string} key the handler key
	 * @returns {boolean} false once the map carries more than one key
	 */
	const record = (key) => {
		if (only !== null && only !== key) return false;
		only = key;
		return true;
	};
	for (const module of chunkGraph.getChunkRuntimeModulesIterable(chunk)) {
		const installed = module.getInstalledChunkHandlers();
		// A module that cannot name what it installs leaves every map unknowable.
		if (installed === null) return null;
		if (installed !== undefined) {
			for (const [map, key] of installed) {
				if (map === handlers && !record(key)) return null;
			}
			continue;
		}
		const code = readCode(module);
		if (code === null) continue;
		MAP_ASSIGNMENT.lastIndex = 0;
		let match;
		while ((match = MAP_ASSIGNMENT.exec(code)) !== null) {
			if (
				`${RuntimeGlobals.require}.${match[1]}` === handlers &&
				!record(match[2])
			) {
				return null;
			}
		}
	}
	return only;
};

module.exports.getOnlyHandlerKey = getOnlyHandlerKey;
