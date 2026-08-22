/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const { isSubset } = require("../util/SetHelpers");
const { getAllChunks } = require("./ChunkHelpers");

/** @import Hash from "../util/Hash" */
/** @import Chunk, { ChunkId } from "../Chunk" */
/**
 * @import ChunkGraph, {
 * 	ModuleId,
 * 	EntryModuleWithChunkGroup
 * } from "../ChunkGraph"
 */
/** @import Entrypoint from "../Entrypoint" */
/** @import RuntimeTemplate from "../RuntimeTemplate" */

const EXPORT_PREFIX = `var ${RuntimeGlobals.exports} = `;

/** @typedef {Set<Chunk>} Chunks */
/** @typedef {ModuleId[]} ModuleIds */

/**
 * The module id an entry helper runs, assigned to `entryModuleId` only where a reader
 * (`require.main`, `import.meta.main`) asked for that global itself.
 * @param {ChunkGraph} chunkGraph chunkGraph
 * @param {Chunk} chunk the chunk the helper is rendered into
 * @param {string} moduleIdExpression the module id the helper runs
 * @returns {string} what to hand `__webpack_require__`
 */
const entryModuleIdExpression = (chunkGraph, chunk, moduleIdExpression) =>
	chunkGraph.getTreeRuntimeRequirements(chunk).has(RuntimeGlobals.entryModuleId)
		? `${RuntimeGlobals.entryModuleId} = ${moduleIdExpression}`
		: moduleIdExpression;

module.exports.entryModuleIdExpression = entryModuleIdExpression;

/**
 * Whether the startup rendered for this chunk waits on other chunks — the one shape
 * `generateEntryStartup` gives a startup helper, rather than calling the entry module
 * straight. Asked while runtime requirements are still open, where that render is long
 * off, so it mirrors its loop rather than reading the output.
 * @param {ChunkGraph} chunkGraph chunkGraph
 * @param {Chunk} chunk chunk
 * @returns {boolean} true when an entry module of this chunk runs behind a chunk load
 */
module.exports.entryStartupAwaitsChunks = (chunkGraph, chunk) => {
	for (const [
		module,
		entrypoint
	] of chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)) {
		if (!chunkGraph.getModuleSourceTypes(module).has("javascript")) {
			continue;
		}
		const group = /** @type {Entrypoint} */ (entrypoint);
		if (getAllChunks(group, chunk, group.getRuntimeChunk()).size > 0) {
			return true;
		}
	}
	return false;
};

/**
 * Returns runtime code.
 * @param {ChunkGraph} chunkGraph chunkGraph
 * @param {RuntimeTemplate} runtimeTemplate runtimeTemplate
 * @param {EntryModuleWithChunkGroup[]} entries entries
 * @param {Chunk} chunk chunk
 * @param {boolean} passive true: passive startup with on chunks loaded
 * @returns {string} runtime code
 */
module.exports.generateEntryStartup = (
	chunkGraph,
	runtimeTemplate,
	entries,
	chunk,
	passive
) => {
	/** @type {string[]} */
	const runtime = [
		`var __webpack_exec__ = ${runtimeTemplate.returningFunction(
			`${RuntimeGlobals.require}(${entryModuleIdExpression(
				chunkGraph,
				chunk,
				"moduleId"
			)})`,
			"moduleId"
		)}`
	];

	/**
	 * Returns fn to execute.
	 * @param {ModuleId} id id
	 * @returns {string} fn to execute
	 */
	const runModule = (id) => `__webpack_exec__(${JSON.stringify(id)})`;
	/**
	 * Output combination.
	 * @param {Chunks} chunks chunks
	 * @param {ModuleIds} moduleIds module ids
	 * @param {boolean=} final true when final, otherwise false
	 */
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
				}(0, ${JSON.stringify(Array.from(chunks, (c) => c.id))}, ${fn});`
			);
			if (final && passive) {
				runtime.push(`${EXPORT_PREFIX}${RuntimeGlobals.onChunksLoaded}();`);
			}
		}
	};

	/** @type {Chunks | undefined} */
	let currentChunks;
	/** @type {ModuleIds | undefined} */
	let currentModuleIds;

	for (const [module, entrypoint] of entries) {
		if (!chunkGraph.getModuleSourceTypes(module).has("javascript")) {
			continue;
		}
		const runtimeChunk =
			/** @type {Entrypoint} */
			(entrypoint).getRuntimeChunk();
		const moduleId = /** @type {ModuleId} */ (chunkGraph.getModuleId(module));
		const chunks = getAllChunks(
			/** @type {Entrypoint} */
			(entrypoint),
			chunk,
			runtimeChunk
		);
		if (
			currentChunks &&
			currentChunks.size === chunks.size &&
			isSubset(currentChunks, chunks)
		) {
			/** @type {ModuleIds} */
			(currentModuleIds).push(moduleId);
		} else {
			if (currentChunks) {
				outputCombination(
					currentChunks,
					/** @type {ModuleIds} */ (currentModuleIds)
				);
			}
			currentChunks = chunks;
			currentModuleIds = [moduleId];
		}
	}

	// output current modules with export prefix
	if (currentChunks) {
		outputCombination(
			currentChunks,
			/** @type {ModuleIds} */
			(currentModuleIds),
			true
		);
	}
	runtime.push("");
	return Template.asString(runtime);
};

/**
 * Returns initially fulfilled chunk ids.
 * @param {Chunk} chunk the chunk
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {(chunk: Chunk, chunkGraph: ChunkGraph) => boolean} filterFn filter function
 * @returns {Set<ChunkId>} initially fulfilled chunk ids
 */
module.exports.getInitialChunkIds = (chunk, chunkGraph, filterFn) => {
	/** @type {Set<ChunkId>} */
	const initialChunkIds = new Set(chunk.ids);
	for (const c of chunk.getAllInitialChunks()) {
		if (c === chunk || filterFn(c, chunkGraph)) continue;
		for (const id of /** @type {ChunkId[]} */ (c.ids)) {
			initialChunkIds.add(id);
		}
	}
	return initialChunkIds;
};

/**
 * Processes the provided hash.
 * @param {Hash} hash the hash to update
 * @param {ChunkGraph} chunkGraph chunkGraph
 * @param {EntryModuleWithChunkGroup[]} entries entries
 * @param {Chunk} chunk chunk
 * @returns {void}
 */
module.exports.updateHashForEntryStartup = (
	hash,
	chunkGraph,
	entries,
	chunk
) => {
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
