/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, RawSource } = require("webpack-sources");
const { RuntimeGlobals } = require("..");
const HotUpdateChunk = require("../HotUpdateChunk");
const Template = require("../Template");
const {
	getCompilationHooks,
	getChunkFilenameTemplate
} = require("../javascript/JavascriptModulesPlugin");
const {
	generateEntryStartup,
	updateHashForEntryStartup
} = require("../javascript/StartupHelpers");

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
								const runtimeOutputName = compilation
									.getPath(
										getChunkFilenameTemplate(
											runtimeChunk,
											compilation.outputOptions
										),
										{
											chunk: runtimeChunk,
											contentHashType: "javascript"
										}
									)
									.split("/");

								// remove filename, we only need the directory
								const outputFilename = currentOutputName.pop();

								// remove common parts
								while (
									currentOutputName.length > 0 &&
									runtimeOutputName.length > 0 &&
									currentOutputName[0] === runtimeOutputName[0]
								) {
									currentOutputName.shift();
									runtimeOutputName.shift();
								}

								// create final path
								const runtimePath =
									(currentOutputName.length > 0
										? "../".repeat(currentOutputName.length)
										: "./") + runtimeOutputName.join("/");

								const entrySource = new ConcatSource();
								entrySource.add(source);
								entrySource.add(";\n\n// load runtime\n");
								entrySource.add(
									`import __webpack_require__ from ${JSON.stringify(
										runtimePath
									)};\n`
								);
								entrySource.add(
									`import * as __webpack_self_exports__ from ${JSON.stringify(
										"./" + outputFilename
									)};\n`
								);
								entrySource.add(
									`${RuntimeGlobals.externalInstallChunk}(__webpack_self_exports__);\n`
								);
								const startupSource = new RawSource(
									generateEntryStartup(
										chunkGraph,
										runtimeTemplate,
										entries,
										chunk,
										false
									)
								);
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
