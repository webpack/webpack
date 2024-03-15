/*
    MIT License http://www.opensource.org/licenses/mit-license.php
	Author Daniel Kuschny @danielku15
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */

/**
 * This runtime module makes the list of filenames available required
 * to be added as dependencies into a worklet. This is used together with the WorkletPlugin
 * and WorkletDependency to inject all required chunks for starting via addModule
 */
class GetWorkletChunksRuntimeModule extends RuntimeModule {
	constructor() {
		super(`get worklet chunks`);
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const chunkGraph = /** @type {ChunkGraph} */ (this.chunkGraph);
		const { runtimeTemplate } = compilation;

		/**@type {Map<string, string[]>} */
		const workletChunkLookup = new Map();

		const allChunks = compilation.chunks;
		for (const chunk of allChunks) {
			const isWorkletEntry = chunkGraph
				.getTreeRuntimeRequirements(chunk)
				.has(RuntimeGlobals.getWorkletChunksIsWorklet);
			if (isWorkletEntry) {
				const workletChunks = Array.from(chunk.getAllReferencedChunks()).map(
					c =>
						compilation.getPath(
							JavascriptModulesPlugin.getChunkFilenameTemplate(
								c,
								compilation.outputOptions
							),
							{
								chunk: c,
								contentHashType: "javascript"
							}
						)
				);
				workletChunkLookup.set(String(chunk.id), workletChunks);
			}
		}

		return Template.asString([
			"// This function allows obtaining the list of chunks needed to start a worklet",
			`${RuntimeGlobals.getWorkletChunks} = (${runtimeTemplate.basicFunction(
				"",
				Template.asString([
					"const lookup = new Map(",
					Template.indent(
						JSON.stringify(Array.from(workletChunkLookup.entries()))
					),
					");",
					`return ${runtimeTemplate.basicFunction("chunkId", "return lookup.get(String(chunkId)) ?? [];")}`
				])
			)})`,
			")();"
		]);
	}
}

module.exports = GetWorkletChunksRuntimeModule;
