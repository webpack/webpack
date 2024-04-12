/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const { isSubset } = require("../util/SetHelpers");
const { getAllChunks } = require("./ChunkHelpers");

/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Chunk").ChunkId} ChunkId */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Entrypoint")} Entrypoint */
/** @typedef {import("../ChunkGraph").EntryModuleWithChunkGroup} EntryModuleWithChunkGroup */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {(string|number)[]} EntryItem */

const EXPORT_PREFIX = `var ${RuntimeGlobals.exports} = `;

/**
 * @param {ChunkGraph} chunkGraph chunkGraph
 * @param {RuntimeTemplate} runtimeTemplate runtimeTemplate
 * @param {EntryModuleWithChunkGroup[]} entries entries
 * @param {Chunk} chunk chunk
 * @param {boolean} passive true: passive startup with on chunks loaded
 * @returns {string} runtime code
 */
exports.generateEntryStartup = (
	chunkGraph,
	runtimeTemplate,
	entries,
	chunk,
	passive
) => {
	/** @type {string[]} */
	const runtime = [
		`var __webpack_exec__ = ${runtimeTemplate.returningFunction(
			`${RuntimeGlobals.require}(${RuntimeGlobals.entryModuleId} = moduleId)`,
			"moduleId"
		)}`
	];

	const runModule = id => {
		return `__webpack_exec__(${JSON.stringify(id)})`;
	};
	const outputCombination = (chunks, moduleIds, final) => {
		if (chunks.size === 0) {
			runtime.push(
				`${final ? EXPORT_PREFIX : ""}(${moduleIds.map(runModule).join(", ")});`
			);
		} else {
			const fn = runtimeTemplate.returningFunction(
				moduleIds.map(runModule).join(", ")
			);
			runtime.push(
				`${final && !passive ? EXPORT_PREFIX : ""}${
					passive
						? RuntimeGlobals.onChunksLoaded
						: RuntimeGlobals.startupEntrypoint
				}(0, ${JSON.stringify(Array.from(chunks, c => c.id))}, ${fn});`
			);
			if (final && passive) {
				runtime.push(`${EXPORT_PREFIX}${RuntimeGlobals.onChunksLoaded}();`);
			}
		}
	};

	let currentChunks = undefined;
	let currentModuleIds = undefined;

	for (const [module, entrypoint] of entries) {
		const runtimeChunk =
			/** @type {Entrypoint} */
			(entrypoint).getRuntimeChunk();
		const moduleId = chunkGraph.getModuleId(module);
		const chunks = getAllChunks(
			/** @type {Entrypoint} */ (entrypoint),
			chunk,
			runtimeChunk
		);
		if (
			currentChunks &&
			currentChunks.size === chunks.size &&
			isSubset(currentChunks, chunks)
		) {
			currentModuleIds.push(moduleId);
		} else {
			if (currentChunks) {
				outputCombination(currentChunks, currentModuleIds);
			}
			currentChunks = chunks;
			currentModuleIds = [moduleId];
		}
	}

	// output current modules with export prefix
	if (currentChunks) {
		outputCombination(currentChunks, currentModuleIds, true);
	}
	runtime.push("");
	return Template.asString(runtime);
};

/**
 * @param {Hash} hash the hash to update
 * @param {ChunkGraph} chunkGraph chunkGraph
 * @param {EntryModuleWithChunkGroup[]} entries entries
 * @param {Chunk} chunk chunk
 * @returns {void}
 */
exports.updateHashForEntryStartup = (hash, chunkGraph, entries, chunk) => {
	for (const [module, entrypoint] of entries) {
		const runtimeChunk =
			/** @type {Entrypoint} */
			(entrypoint).getRuntimeChunk();
		const moduleId = chunkGraph.getModuleId(module);
		hash.update(`${moduleId}`);
		for (const c of getAllChunks(
			/** @type {Entrypoint} */ (entrypoint),
			chunk,
			/** @type {Chunk} */ (runtimeChunk)
		)) {
			hash.update(`${c.id}`);
		}
	}
};

/**
 * @param {Chunk} chunk the chunk
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {function(Chunk, ChunkGraph): boolean} filterFn filter function
 * @returns {Set<number | string>} initially fulfilled chunk ids
 */
exports.getInitialChunkIds = (chunk, chunkGraph, filterFn) => {
	const initialChunkIds = new Set(chunk.ids);
	for (const c of chunk.getAllInitialChunks()) {
		if (c === chunk || filterFn(c, chunkGraph)) continue;
		for (const id of /** @type {ChunkId[]} */ (c.ids)) {
			initialChunkIds.add(id);
		}
	}
	return initialChunkIds;
};
