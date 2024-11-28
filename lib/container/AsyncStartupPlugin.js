/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author  Zackary Jackson @ScriptedAlchemy
*/

"use strict";

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../javascript/StartupHelpers").StartupChunkDependencyParams} StartupChunkDependencyParams */

const RuntimeGlobals = require("../RuntimeGlobals");
const ContainerEntryModule = require("./ContainerEntryModule");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const Template = require("../Template");
const { ConcatSource, PrefixSource } = require("webpack-sources");
const memoize = require("../util/memoize");
const getModuleFederationPlugin = memoize(() =>
	require("./ModuleFederationPlugin")
);

class AsyncStartupPlugin {
	constructor(options = {}) {
		this.asyncChunkLoading =
			options.asyncChunkLoading !== undefined
				? options.asyncChunkLoading
				: true;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"AsyncStartupPlugin",
			/** @type {Compilation} */
			compilation => {
				/**
				 * Determines if async initialization should be enabled for a chunk
				 * @param {Chunk} chunk the chunk
				 * @returns {boolean} true if async initialization should be enabled
				 */
				const shouldEnableAsyncInit = chunk => {
					if (chunk.id === "build time chunk") return false;

					const [finalEntry] =
						Array.from(
							compilation.chunkGraph.getChunkEntryModulesIterable(chunk)
						).reverse() || [];
					// do not wrap remote entry container in promise
					return !(finalEntry instanceof ContainerEntryModule);
				};

				// Handle additional tree runtime requirements
				// compilation.hooks.additionalTreeRuntimeRequirements.tap(
				// 	"AsyncStartupPlugin",
				// 	(chunk, set) => {
				// 		if (!shouldEnableAsyncInit(chunk)) return;
				// 		if (chunk.hasRuntime()) {
				// 			set.add(RuntimeGlobals.startupEntrypoint);
				// 			set.add(RuntimeGlobals.ensureChunk);
				// 			set.add(RuntimeGlobals.ensureChunkIncludeEntries);
				// 		}
				// 	}
				// );

				// Handle chunk runtime requirements
				compilation.hooks.additionalChunkRuntimeRequirements.tap(
					"AsyncStartupPlugin",
					(chunk, set, { chunkGraph }) => {
						if (!shouldEnableAsyncInit(chunk)) return;
						if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return;
						set.add(RuntimeGlobals.federationStartup);
					}
				);

				// Handle runtime requirement in tree
				// compilation.hooks.runtimeRequirementInTree
				// 	.for(RuntimeGlobals.startupEntrypoint)
				// 	.tap("AsyncStartupPlugin", (chunk, set) => {
				// 		if (!shouldEnableAsyncInit(chunk)) return;
				// 		// set.add(RuntimeGlobals.require);
				// 		// set.add(RuntimeGlobals.ensureChunk);
				// 		// set.add(RuntimeGlobals.ensureChunkIncludeEntries);
				// 		// set.add(RuntimeGlobals.startupEntrypoint);
				//
				// 		compilation.addRuntimeModule(
				// 			chunk,
				// 			new StartupEntrypointRuntimeModule(this.asyncChunkLoading)
				// 		);
				// 	});

				const { renderStartup } =
					JavascriptModulesPlugin.getCompilationHooks(compilation);
				const hooks =
					getModuleFederationPlugin().getCompilationHooks(compilation);

				/** @type {Map<Chunk, Source>} */
				const libraryExportForChunkMap = new Map();

				hooks.libraryExport.tap(
					"AsyncStartupPlugin",
					(libExport, module, chunk, exportInfo) => {
						const libraryExport = new ConcatSource();
						for (const exportLine of libExport) {
							libraryExport.add(exportLine);
						}
						libraryExportForChunkMap.set(chunk, libraryExport);
						return true;
					}
				);

				/**
				 * @typedef {object} WrapFederationSourceArgs
				 * @property {string|import("webpack-sources").Source} source
				 * @property {import("../Chunk")} chunk
				 */

				/**
				 * @param {WrapFederationSourceArgs} args
				 * @returns {import("webpack-sources").Source}
				 */
				hooks.wrapFederationSource.tap(
					"AsyncStartupPlugin",
					/**
					 * Wraps the federation source with async initialization
					 * @param {string|import("webpack-sources").Source} source The source to wrap
					 * @param {import("../Chunk")} chunk The chunk being processed
					 * @returns {import("webpack-sources").Source|string|null} The wrapped source
					 */
					(source, chunk) => {
						const treeRuntimeRequirements =
							compilation.chunkGraph.getTreeRuntimeRequirements(chunk);

						const chunkRuntimeRequirements =
							compilation.chunkGraph.getChunkRuntimeRequirements(chunk);

						const federation =
							chunkRuntimeRequirements.has(RuntimeGlobals.federationStartup) ||
							treeRuntimeRequirements.has(RuntimeGlobals.federationStartup);
						if (federation) {
							const libraryExportContent = libraryExportForChunkMap.get(chunk);

							return new ConcatSource(
								`var ${RuntimeGlobals.exports} = Promise.all([`,
								"\n",
								Template.indent([
									`${RuntimeGlobals.ensureChunkHandlers}.consumes || function(chunkId, promises) {},`,
									`${RuntimeGlobals.ensureChunkHandlers}.remotes || function(chunkId, promises) {}`
								]),
								"\n",
								`].reduce(${compilation.runtimeTemplate.returningFunction(`handler("${chunk.id}", p), p`, "p, handler")}, []))`,
								".then(function() {",
								new PrefixSource("\n\t", source),
								new PrefixSource("\n\t", `return ${RuntimeGlobals.exports};`),
								"\n",
								"});",
								"\n",
								libraryExportContent
							);
						}

						return source;
					}
				);

				renderStartup.tap(
					"AsyncStartupPlugin",
					/**
					 * @param {Source} source The source to be rendered
					 * @param {Module} module The module being processed
					 * @param {import("../javascript/JavascriptModulesPlugin").StartupRenderContext} context The startup render context
					 * @returns {Source} The processed source
					 */
					(source, module, { chunk, chunkGraph, runtimeTemplate }) => {
						if (!shouldEnableAsyncInit(chunk)) {
							return source;
						}

						const chunkRuntimeRequirements =
							chunkGraph.getChunkRuntimeRequirements(chunk);
						const _treeRuntimeRequirements =
							chunkGraph.getTreeRuntimeRequirements(chunk);

						if (
							!chunkRuntimeRequirements.has(RuntimeGlobals.startupEntrypoint) &&
							!chunkRuntimeRequirements.has(RuntimeGlobals.onChunksLoaded)
						) {
							const _entries = Array.from(
								chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
							);
							// Use the new wrapFederationSource hook
							const wrappedSource = hooks.wrapFederationSource.call(
								source,
								chunk
							);

							if (wrappedSource) {
								return /** @type {Source} */ (wrappedSource);
							}
						}

						const federation = chunkRuntimeRequirements.has(
							RuntimeGlobals.federationStartup
						);

						if (!federation) {
							return source;
						}

						return source;
					}
				);
			}
		);
	}
}

module.exports = AsyncStartupPlugin;
