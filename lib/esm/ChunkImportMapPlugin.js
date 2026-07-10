/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan @aryanraj45
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */

// Per-compilation collector (stable specifier -> resolved chunk URL). It is
// populated while `ModuleChunkFormatPlugin` renders ESM inter-chunk imports and
// emitted as an import map, so those imports reference a content-independent
// specifier instead of a hashed filename — breaking ESM cascading cache
// invalidation (a leaf chunk's hash change no longer re-hashes its importers).
// Experimental; static initial-graph imports only (async `import()` is a TODO).
/** @type {WeakMap<Compilation, Map<string, string>>} */
const importMaps = new WeakMap();

const PLUGIN_NAME = "ChunkImportMapPlugin";

class ChunkImportMapPlugin {
	/**
	 * The stable, content-independent specifier used as a chunk's import-map key.
	 * @param {Chunk} chunk the chunk
	 * @returns {string} the specifier
	 */
	static getSpecifier(chunk) {
		return `webpack/c/${chunk.id}`;
	}

	/**
	 * The collector for a compilation when the feature is active, else undefined.
	 * @param {Compilation} compilation the compilation
	 * @returns {Map<string, string> | undefined} the collector
	 */
	static getImportMap(compilation) {
		return importMaps.get(compilation);
	}

	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			/** @type {Map<string, string>} */
			const collector = new Map();
			importMaps.set(compilation, collector);
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					// After chunk assets exist (so the collector is fully populated)
					// but before hashing/optimizing the final asset set.
					stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
				},
				() => {
					if (collector.size === 0) return;
					/** @type {Record<string, string>} */
					const imports = {};
					// Sorted for deterministic output across builds.
					for (const key of [...collector.keys()].sort()) {
						imports[key] = /** @type {string} */ (collector.get(key));
					}
					compilation.emitAsset(
						"importmap.json",
						new RawSource(JSON.stringify({ imports }, null, 2))
					);
				}
			);
		});
	}
}

module.exports = ChunkImportMapPlugin;
