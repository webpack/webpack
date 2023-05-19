/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const { RuntimeGlobals } = require("..");
const HotUpdateChunk = require("../HotUpdateChunk");
const Template = require("../Template");
const { getAllChunks } = require("../javascript/ChunkHelpers");
const {
	chunkHasJs,
	getCompilationHooks,
	getChunkFilenameTemplate
} = require("../javascript/JavascriptModulesPlugin");
const { updateHashForEntryStartup } = require("../javascript/StartupHelpers");

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
							set.add(RuntimeGlobals.require);
							set.add(RuntimeGlobals.startupEntrypoint);
							set.add(RuntimeGlobals.externalInstallChunk);
						}
					}
				);
				const hooks = getCompilationHooks(compilation);
				hooks.renderChunk.tap(
					"ModuleChunkFormatPlugin",
					(modules, renderContext) => {
						const { chunk, chunkGraph, runtimeTemplate } = renderContext;
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
								const runtimeChunk = entries[0][1].getRuntimeChunk();
								const currentOutputName = compilation
									.getPath(
										getChunkFilenameTemplate(chunk, compilation.outputOptions),
										{
											chunk,
											contentHashType: "javascript"
										}
									)
									.split("/");

								// remove filename, we only need the directory
								currentOutputName.pop();

								const getRelativePath = chunk => {
									const baseOutputName = currentOutputName.slice();
									const chunkOutputName = compilation
										.getPath(
											getChunkFilenameTemplate(
												chunk,
												compilation.outputOptions
											),
											{
												chunk: chunk,
												contentHashType: "javascript"
											}
										)
										.split("/");

									// remove common parts
									while (
										baseOutputName.length > 0 &&
										chunkOutputName.length > 0 &&
										baseOutputName[0] === chunkOutputName[0]
									) {
										baseOutputName.shift();
										chunkOutputName.shift();
									}
									// create final path
									return (
										(baseOutputName.length > 0
											? "../".repeat(baseOutputName.length)
											: "./") + chunkOutputName.join("/")
									);
								};

								const entrySource = new ConcatSource();
								entrySource.add(source);
								entrySource.add(";\n\n// load runtime\n");
								entrySource.add(
									`import ${RuntimeGlobals.require} from ${JSON.stringify(
										getRelativePath(runtimeChunk)
									)};\n`
								);

								const startupSource = new ConcatSource();
								startupSource.add(
									`var __webpack_exec__ = ${runtimeTemplate.returningFunction(
										`${RuntimeGlobals.require}(${RuntimeGlobals.entryModuleId} = moduleId)`,
										"moduleId"
									)}\n`
								);

								const loadedChunks = new Set();
								let index = 0;
								for (let i = 0; i < entries.length; i++) {
									const [module, entrypoint] = entries[i];
									const final = i + 1 === entries.length;
									const moduleId = chunkGraph.getModuleId(module);
									const chunks = getAllChunks(
										entrypoint,
										runtimeChunk,
										undefined
									);
									for (const chunk of chunks) {
										if (
											loadedChunks.has(chunk) ||
											!chunkHasJs(chunk, chunkGraph)
										)
											continue;
										loadedChunks.add(chunk);
										startupSource.add(
											`import * as __webpack_chunk_${index}__ from ${JSON.stringify(
												getRelativePath(chunk)
											)};\n`
										);
										startupSource.add(
											`${RuntimeGlobals.externalInstallChunk}(__webpack_chunk_${index}__);\n`
										);
										index++;
									}
									startupSource.add(
										`${
											final ? "var __webpack_exports__ = " : ""
										}__webpack_exec__(${JSON.stringify(moduleId)});\n`
									);
								}

								entrySource.add(
									hooks.renderStartup.call(
										startupSource,
										entries[entries.length - 1][0],
										{
											...renderContext,
											inlined: false
										}
									)
								);
								return entrySource;
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
						const entries = Array.from(
							chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
						);
						updateHashForEntryStartup(hash, chunkGraph, entries, chunk);
					}
				);
			}
		);
	}
}

module.exports = ModuleChunkFormatPlugin;
