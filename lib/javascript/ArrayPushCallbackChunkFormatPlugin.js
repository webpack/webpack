/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import HotUpdateChunk from "../HotUpdateChunk.js";
import * as RuntimeGlobals from "../RuntimeGlobals.js";
import Template from "../Template.js";
import {
	ConcatSource,
	PrefixSource,
	RawSource
} from "../util/webpack-sources.js";
import __JavascriptModulesPlugin from "./JavascriptModulesPlugin.js";
import {
	generateEntryStartup,
	updateHashForEntryStartup
} from "./StartupHelpers.js";

const { getCompilationHooks } = __JavascriptModulesPlugin;
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../ChunkGraph.js").EntryModuleWithChunkGroup} EntryModuleWithChunkGroup */
/** @typedef {import("../CodeGenerationResults.js").default} CodeGenerationResults */

const PLUGIN_NAME = "ArrayPushCallbackChunkFormatPlugin";

class ArrayPushCallbackChunkFormatPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.additionalChunkRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set, { chunkGraph }) => {
					if (chunk.hasRuntime()) return;
					if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
						set.add(RuntimeGlobals.onChunksLoaded);
						set.add(RuntimeGlobals.exports);
						set.add(RuntimeGlobals.require);
					}
					set.add(RuntimeGlobals.chunkCallback);
				}
			);
			const hooks = getCompilationHooks(compilation);
			hooks.renderChunk.tap(PLUGIN_NAME, (modules, renderContext) => {
				const { chunk, chunkGraph, runtimeTemplate } = renderContext;
				const hotUpdateChunk = chunk instanceof HotUpdateChunk ? chunk : null;
				const globalObject = runtimeTemplate.globalObject;
				const source = new ConcatSource();
				const runtimeModules = chunkGraph.getChunkRuntimeModulesInOrder(chunk);
				if (hotUpdateChunk) {
					const hotUpdateGlobal = runtimeTemplate.outputOptions.hotUpdateGlobal;
					source.add(`${globalObject}[${JSON.stringify(hotUpdateGlobal)}](`);
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
					/** @type {EntryModuleWithChunkGroup[]} */
					const entries = [
						...chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
					];
					if (runtimeModules.length > 0 || entries.length > 0) {
						const runtime = new ConcatSource(
							`${
								runtimeTemplate.supportsArrowFunction()
									? `${RuntimeGlobals.require} =>`
									: `function(${RuntimeGlobals.require})`
							} { // webpackRuntimeModules\n`
						);
						if (runtimeModules.length > 0) {
							runtime.add(
								Template.renderRuntimeModules(runtimeModules, {
									...renderContext,
									codeGenerationResults:
										/** @type {CodeGenerationResults} */
										(compilation.codeGenerationResults)
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
									renderContext
								)
							);
							if (
								chunkGraph
									.getChunkRuntimeRequirements(chunk)
									.has(RuntimeGlobals.returnExportsFromRuntime)
							) {
								runtime.add(`return ${RuntimeGlobals.exports};\n`);
							}
						}
						runtime.add("}\n");
						source.add(",\n");
						source.add(new PrefixSource("/******/ ", runtime));
					}
					source.add("])");
				}
				return source;
			});
			hooks.chunkHash.tap(
				PLUGIN_NAME,
				(chunk, hash, { chunkGraph, runtimeTemplate }) => {
					if (chunk.hasRuntime()) return;
					hash.update(
						`${PLUGIN_NAME}1${runtimeTemplate.outputOptions.chunkLoadingGlobal}${runtimeTemplate.outputOptions.hotUpdateGlobal}${runtimeTemplate.globalObject}`
					);
					/** @type {EntryModuleWithChunkGroup[]} */
					const entries = [
						...chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
					];
					updateHashForEntryStartup(hash, chunkGraph, entries, chunk);
				}
			);
		});
	}
}

export default ArrayPushCallbackChunkFormatPlugin;

export { ArrayPushCallbackChunkFormatPlugin as "module.exports" };
