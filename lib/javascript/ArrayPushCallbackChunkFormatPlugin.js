/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, PrefixSource, RawSource } = require("webpack-sources");
const { RuntimeGlobals } = require("..");
const HotUpdateChunk = require("../HotUpdateChunk");
const Template = require("../Template");
const { getAllChunks } = require("./ChunkHelpers");
const { getCompilationHooks } = require("./JavascriptModulesPlugin");
const {
	generateEntryStartup,
	updateHashForEntryStartup
} = require("./StartupHelpers");

/** @import Chunk from "../Chunk" */
/** @import Compiler from "../Compiler" */
/** @import Entrypoint from "../Entrypoint" */
/** @import { EntryModuleWithChunkGroup } from "../ChunkGraph" */
/** @import CodeGenerationResults from "../CodeGenerationResults" */

const PLUGIN_NAME = "ArrayPushCallbackChunkFormatPlugin";

/** Holds the entry exports for a library, which `Array.prototype.push` can't return. */
const LIBRARY_EXPORTS = "__webpack_library_exports__";

/**
 * The message thrown when a library chunk is evaluated before the chunks carrying its runtime.
 * @param {Chunk} chunk the chunk without a runtime
 * @param {EntryModuleWithChunkGroup[]} entries entries of the chunk
 * @returns {string} the error message
 */
const notLoadedYetMessage = (chunk, entries) => {
	/** @type {Set<Chunk>} */
	const required = new Set();
	for (const [, entrypoint] of entries) {
		for (const c of getAllChunks(
			/** @type {Entrypoint} */ (entrypoint),
			chunk
		)) {
			required.add(c);
		}
	}
	const names = Array.from(required, (c) => `"${c.name || c.id}"`).join(", ");
	return `Chunk "${
		chunk.name || chunk.id
	}" has no webpack runtime of its own. The chunks it needs (${names}) must be loaded before it, otherwise its library exports are not available.`;
};

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
					const chunkLoadingGlobalExpr = `${globalObject}[${JSON.stringify(
						chunkLoadingGlobal
					)}]`;
					/** @type {EntryModuleWithChunkGroup[]} */
					const entries = [
						...chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
					];
					// A library reads its value back from this expression, but `push` returns the
					// exports only once the runtime chunk has replaced it, so hold them in a
					// binding of our own and throw for a missing one instead of leaking a number.
					const returnsExports =
						entries.length > 0 &&
						chunkGraph
							.getChunkRuntimeRequirements(chunk)
							.has(RuntimeGlobals.returnExportsFromRuntime);
					if (returnsExports) {
						source.add(
							`${
								runtimeTemplate.supportsArrowFunction()
									? "(() => {"
									: "(function() {"
							}\n${runtimeTemplate.renderLet()} ${LIBRARY_EXPORTS};\n`
						);
					}
					source.add(
						`(${runtimeTemplate.assignOr(chunkLoadingGlobalExpr, "[]")}).push([`
					);
					source.add(`${JSON.stringify(chunk.ids)},`);
					source.add(modules);
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
							if (returnsExports) {
								runtime.add(
									`return (${LIBRARY_EXPORTS} = ${RuntimeGlobals.exports});\n`
								);
							}
						}
						runtime.add("}\n");
						source.add(",\n");
						source.add(new PrefixSource("/******/ ", runtime));
					}
					source.add("])");
					if (returnsExports) {
						source.add(
							`;\nif(${LIBRARY_EXPORTS} === undefined) throw new Error(${JSON.stringify(
								notLoadedYetMessage(chunk, entries)
							)});\nreturn ${LIBRARY_EXPORTS};\n})()`
						);
					}
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

module.exports = ArrayPushCallbackChunkFormatPlugin;
