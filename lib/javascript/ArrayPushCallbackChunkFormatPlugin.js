/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, PrefixSource, RawSource } = require("webpack-sources");
const { RuntimeGlobals } = require("..");
const HotUpdateChunk = require("../HotUpdateChunk");
const Template = require("../Template");
const { getCompilationHooks } = require("./JavascriptModulesPlugin");
const { generateEntryStartup } = require("./StartupHelpers");

/** @typedef {import("../Compiler")} Compiler */

class ArrayPushCallbackChunkFormatPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"ArrayPushCallbackChunkFormatPlugin",
			compilation => {
				compilation.hooks.additionalChunkRuntimeRequirements.tap(
					"ArrayPushCallbackChunkFormatPlugin",
					(chunk, set) => {
						if (chunk.hasRuntime()) return;
						if (compilation.chunkGraph.getNumberOfEntryModules(chunk) > 0) {
							set.add(RuntimeGlobals.onChunksLoaded);
							set.add(RuntimeGlobals.require);
						}
						set.add(RuntimeGlobals.chunkCallback);
					}
				);
				const hooks = getCompilationHooks(compilation);
				hooks.renderChunk.tap(
					"ArrayPushCallbackChunkFormatPlugin",
					(modules, renderContext) => {
						const { chunk, chunkGraph, runtimeTemplate } = renderContext;
						const hotUpdateChunk =
							chunk instanceof HotUpdateChunk ? chunk : null;
						const globalObject = runtimeTemplate.outputOptions.globalObject;
						const source = new ConcatSource();
						const runtimeModules = chunkGraph.getChunkRuntimeModulesInOrder(
							chunk
						);
						if (hotUpdateChunk) {
							const hotUpdateGlobal =
								runtimeTemplate.outputOptions.hotUpdateGlobal;
							source.add(
								`${globalObject}[${JSON.stringify(hotUpdateGlobal)}](`
							);
							source.add(`${JSON.stringify(chunk.id)},`);
							source.add(modules);
							if (runtimeModules.length > 0) {
								source.add(",\n");
								const runtimePart = Template.renderChunkRuntimeModules(
									runtimeModules,
									renderContext
								);
								source.add(runtimePart);
							}
							source.add(")");
						} else {
							const chunkLoadingGlobal =
								runtimeTemplate.outputOptions.chunkLoadingGlobal;
							source.add(
								`(${globalObject}[${JSON.stringify(
									chunkLoadingGlobal
								)}] = ${globalObject}[${JSON.stringify(
									chunkLoadingGlobal
								)}] || []).push([`
							);
							source.add(`${JSON.stringify(chunk.ids)},`);
							source.add(modules);
							const entries = Array.from(
								chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
							);
							if (runtimeModules.length > 0 || entries.length > 0) {
								const strictBailout = hooks.strictRuntimeBailout.call(
									renderContext
								);
								const runtime = new ConcatSource(
									(runtimeTemplate.supportsArrowFunction()
										? "__webpack_require__ =>"
										: "function(__webpack_require__)") +
										" { // webpackRuntimeModules\n",
									strictBailout
										? `// runtime can't be in strict mode because ${strictBailout}.\n\n`
										: '"use strict";\n\n'
								);
								if (runtimeModules.length > 0) {
									runtime.add(
										Template.renderRuntimeModules(runtimeModules, {
											...renderContext,
											codeGenerationResults: compilation.codeGenerationResults,
											useStrict: !!strictBailout
										})
									);
								}
								if (entries.length > 0) {
									const startupSource = new RawSource(
										generateEntryStartup(
											chunkGraph,
											runtimeTemplate,
											entries,
											chunk,
											true
										)
									);
									runtime.add(
										hooks.renderStartup.call(
											startupSource,
											entries[entries.length - 1][0],
											{
												...renderContext,
												inlined: false
											}
										)
									);
								}
								runtime.add("}\n");
								source.add(",\n");
								source.add(new PrefixSource("/******/ ", runtime));
							}
							source.add("])");
						}
						return source;
					}
				);
				hooks.chunkHash.tap(
					"ArrayPushCallbackChunkFormatPlugin",
					(chunk, hash, { chunkGraph, runtimeTemplate }) => {
						if (chunk.hasRuntime()) return;
						hash.update("ArrayPushCallbackChunkFormatPlugin");
						hash.update("1");
						hash.update(`${runtimeTemplate.outputOptions.chunkLoadingGlobal}`);
						hash.update(`${runtimeTemplate.outputOptions.hotUpdateGlobal}`);
						hash.update(`${runtimeTemplate.outputOptions.globalObject}`);
					}
				);
			}
		);
	}
}

module.exports = ArrayPushCallbackChunkFormatPlugin;
