/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime module that wraps the startup function so entry-dependent chunks are
 * ensured before the entry itself executes.
 */
class StartupChunkDependenciesRuntimeModule extends RuntimeModule {
	/**
	 * Chooses whether dependent chunks should be awaited through promises or
	 * ensured synchronously before continuing startup.
	 * @param {boolean} asyncChunkLoading use async chunk loading
	 */
	constructor(asyncChunkLoading) {
		super("startup chunk dependencies", RuntimeModule.STAGE_TRIGGER);
		/** @type {boolean} */
		this.asyncChunkLoading = asyncChunkLoading;
	}

	/**
	 * Generates the startup wrapper that ensures every entry-dependent chunk for
	 * the current chunk has finished loading before delegating to the original
	 * startup function.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const chunkGraph = /** @type {ChunkGraph} */ (this.chunkGraph);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const chunkIds = [
			...chunkGraph.getChunkEntryDependentChunksIterable(chunk)
		].map((chunk) => chunk.id);
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		return Template.asString([
			`var next = ${RuntimeGlobals.startup};`,
			`${RuntimeGlobals.startup} = ${runtimeTemplate.basicFunction(
				"",
				!this.asyncChunkLoading
					? [
							...chunkIds.map(
								(id) => `${RuntimeGlobals.ensureChunk}(${JSON.stringify(id)});`
							),
							"return next();"
						]
					: chunkIds.length === 1
						? `return ${RuntimeGlobals.ensureChunk}(${JSON.stringify(
								chunkIds[0]
							)}).then(next);`
						: chunkIds.length > 2
							? [
									// using map is shorter for 3 or more chunks
									`return Promise.all(${JSON.stringify(chunkIds)}.map(${
										RuntimeGlobals.ensureChunk
									}, ${RuntimeGlobals.require})).then(next);`
								]
							: [
									// calling ensureChunk directly is shorter for 0 - 2 chunks
									"return Promise.all([",
									Template.indent(
										chunkIds
											.map(
												(id) =>
													`${RuntimeGlobals.ensureChunk}(${JSON.stringify(id)})`
											)
											.join(",\n")
									),
									"]).then(next);"
								]
			)};`
		]);
	}
}

module.exports = StartupChunkDependenciesRuntimeModule;
