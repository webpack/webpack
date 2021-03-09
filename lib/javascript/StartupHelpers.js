/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Entrypoint = require("../Entrypoint");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const { isSubset } = require("../util/SetHelpers");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {(string|number)[]} EntryItem */

// TODO move to this file to ../javascript/ChunkHelpers.js

/**
 * @param {Entrypoint} entrypoint a chunk group
 * @param {Chunk} excludedChunk1 current chunk which is excluded
 * @param {Chunk} excludedChunk2 runtime chunk which is excluded
 * @returns {Set<Chunk>} chunks
 */
const getAllChunks = (entrypoint, excludedChunk1, excludedChunk2) => {
	const queue = new Set([entrypoint]);
	const chunks = new Set();
	for (const entrypoint of queue) {
		for (const chunk of entrypoint.chunks) {
			if (chunk === excludedChunk1) continue;
			if (chunk === excludedChunk2) continue;
			chunks.add(chunk);
		}
		for (const parent of entrypoint.parentsIterable) {
			if (parent instanceof Entrypoint) queue.add(parent);
		}
	}
	return chunks;
};

const EXPORT_PREFIX = "var __webpack_exports__ = ";

/**
 * @param {ChunkGraph} chunkGraph chunkGraph
 * @param {RuntimeTemplate} runtimeTemplate runtimeTemplate
 * @param {import("../ChunkGraph").EntryModuleWithChunkGroup[]} entries entries
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
			`__webpack_require__(${RuntimeGlobals.entryModuleId} = moduleId)`,
			"moduleId"
		)}`
	];

	const runModule = id => {
		return `__webpack_exec__(${JSON.stringify(id)})`;
	};
	const outputCombination = (chunks, moduleIds, final) => {
		const old = final ? "undefined" : "0";
		const prefix = final ? EXPORT_PREFIX : "";
		if (chunks.size === 0) {
			runtime.push(`${prefix}(${moduleIds.map(runModule).join(", ")});`);
		} else {
			const fn = runtimeTemplate.returningFunction(
				moduleIds.map(runModule).join(", ")
			);
			runtime.push(
				`${prefix}${
					passive
						? RuntimeGlobals.onChunksLoaded
						: RuntimeGlobals.startupEntrypoint
				}(${old}, ${JSON.stringify(Array.from(chunks, c => c.id))}, ${fn});`
			);
		}
	};

	let currentChunks = undefined;
	let currentModuleIds = undefined;

	for (const [module, entrypoint] of entries) {
		const runtimeChunk = entrypoint.getRuntimeChunk();
		const moduleId = chunkGraph.getModuleId(module);
		const chunks = getAllChunks(entrypoint, chunk, runtimeChunk);
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
