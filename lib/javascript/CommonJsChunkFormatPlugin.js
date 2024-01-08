/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, RawSource } = require("webpack-sources");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const {
	getChunkFilenameTemplate,
	getCompilationHooks
} = require("./JavascriptModulesPlugin");
const {
	generateEntryStartup,
	updateHashForEntryStartup
} = require("./StartupHelpers");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Entrypoint")} Entrypoint */

class CommonJsChunkFormatPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"CommonJsChunkFormatPlugin",
			compilation => {
				compilation.hooks.additionalChunkRuntimeRequirements.tap(
					"CommonJsChunkLoadingPlugin",
					(chunk, set, { chunkGraph }) => {
						if (chunk.hasRuntime()) return;
						if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
							set.add(RuntimeGlobals.require);
							set.add(RuntimeGlobals.startupEntrypoint);
							set.add(RuntimeGlobals.externalInstallChunk);
						}
					}
				);
				const hooks = getCompilationHooks(compilation);
				hooks.renderChunk.tap(
					"CommonJsChunkFormatPlugin",
					(modules, renderContext) => {
						const { chunk, chunkGraph, runtimeTemplate } = renderContext;
						const source = new ConcatSource();
						source.add(`exports.id = ${JSON.stringify(chunk.id)};\n`);
						source.add(`exports.ids = ${JSON.stringify(chunk.ids)};\n`);
						source.add(`exports.modules = `);
						source.add(modules);
						source.add(";\n");
						const runtimeModules =
							chunkGraph.getChunkRuntimeModulesInOrder(chunk);
						if (runtimeModules.length > 0) {
							source.add("exports.runtime =\n");
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
							const runtimeChunk =
								/** @type {Entrypoint} */
								(entries[0][1]).getRuntimeChunk();
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
										chunk: /** @type {Chunk} */ (runtimeChunk),
										contentHashType: "javascript"
									}
								)
								.split("/");

							// remove filename, we only need the directory
							currentOutputName.pop();

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
							entrySource.add(
								`(${
									runtimeTemplate.supportsArrowFunction()
										? "() => "
										: "function() "
								}{\n`
							);
							entrySource.add("var exports = {};\n");
							entrySource.add(source);
							entrySource.add(";\n\n// load runtime\n");
							entrySource.add(
								`var ${RuntimeGlobals.require} = require(${JSON.stringify(
									runtimePath
								)});\n`
							);
							entrySource.add(
								`${RuntimeGlobals.externalInstallChunk}(exports);\n`
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
							entrySource.add("\n})()");
							return entrySource;
						}
						return source;
					}
				);
				hooks.chunkHash.tap(
					"CommonJsChunkFormatPlugin",
					(chunk, hash, { chunkGraph }) => {
						if (chunk.hasRuntime()) return;
						hash.update("CommonJsChunkFormatPlugin");
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

module.exports = CommonJsChunkFormatPlugin;
