/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const { RuntimeGlobals } = require("..");
const HotUpdateChunk = require("../HotUpdateChunk");
const Template = require("../Template");
const {
	getCompilationHooks
} = require("../javascript/JavascriptModulesPlugin");

/** @typedef {import("../Compiler")} Compiler */

class ModuleChunkFormatPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"ModuleChunkFormatPlugin",
			compilation => {
				compilation.hooks.additionalChunkRuntimeRequirements.tap(
					"ModuleChunkFormatPlugin",
					(chunk, set) => {
						if (chunk.hasRuntime()) return;
						if (compilation.chunkGraph.getNumberOfEntryModules(chunk) > 0) {
							set.add(RuntimeGlobals.onChunksLoaded);
							set.add(RuntimeGlobals.require);
						}
					}
				);
				const hooks = getCompilationHooks(compilation);
				hooks.renderChunk.tap(
					"ModuleChunkFormatPlugin",
					(modules, renderContext) => {
						const { chunk, chunkGraph } = renderContext;
						const hotUpdateChunk =
							chunk instanceof HotUpdateChunk ? chunk : null;
						const source = new ConcatSource();
						if (hotUpdateChunk) {
							throw new Error(
								"HMR is not implemented for module chunk format yet"
							);
						} else {
							source.add(`export const id = ${JSON.stringify(chunk.id)};\n`);
							source.add(`export const ids = ${JSON.stringify(chunk.ids)};\n`);
							source.add(`export const modules = `);
							source.add(modules);
							source.add(`;\n`);
							const runtimeModules =
								chunkGraph.getChunkRuntimeModulesInOrder(chunk);
							if (runtimeModules.length > 0) {
								source.add("export const runtime =\n");
								source.add(
									Template.renderChunkRuntimeModules(
										runtimeModules,
										renderContext
									)
								);
							}
							const entries = Array.from(
								chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
							);
							if (entries.length > 0) {
								throw new Error(
									"Entry modules in chunk is not implemented for module chunk format yet"
								);
							}
						}
						return source;
					}
				);
				hooks.chunkHash.tap(
					"ModuleChunkFormatPlugin",
					(chunk, hash, { chunkGraph, runtimeTemplate }) => {
						if (chunk.hasRuntime()) return;
						hash.update("ModuleChunkFormatPlugin");
						hash.update("1");
						// TODO
						// const entries = Array.from(
						// 	chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
						// );
						// updateHashForEntryStartup(hash, chunkGraph, entries, chunk);
					}
				);
			}
		);
	}
}

module.exports = ModuleChunkFormatPlugin;
