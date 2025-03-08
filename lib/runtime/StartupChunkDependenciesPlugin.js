// @ts-nocheck
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const StartupChunkDependenciesRuntimeModule = require("./StartupChunkDependenciesRuntimeModule");
const StartupEntrypointRuntimeModule = require("./StartupEntrypointRuntimeModule");
const federationStartup = require("../RuntimeGlobals");
const { generateESMEntryStartup } = require("../RuntimeGlobals");


/** @typedef {import("../../declarations/WebpackOptions").ChunkLoadingType} ChunkLoadingType */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

/**
 * @typedef {object} Options
 * @property {ChunkLoadingType} chunkLoading
 * @property {boolean=} asyncChunkLoading
 */

class StartupChunkDependenciesPlugin {
	/**
	 * @param {Options} options options
	 */
	constructor(options) {
		this.chunkLoading = options.chunkLoading;
		this.asyncChunkLoading =
			typeof options.asyncChunkLoading === "boolean"
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
			'MfStartupChunkDependenciesPlugin',
			(/** @type {import("../Compilation")} */ compilation) => {
			  const isEnabledForChunk = (/** @type {any} */ chunk) =>
				this.isEnabledForChunk(chunk, compilation);
		compiler.hooks.thisCompilation.tap(
			"StartupChunkDependenciesPlugin",
			(			/** @type {{ outputOptions: { chunkLoading: any; }; hooks: { additionalTreeRuntimeRequirements: { tap: (arg0: string, arg1: (chunk: import("../Chunk"), set: { add: (arg0: string) => void; }, { chunkGraph }: { chunkGraph: any; }) => void) => void; }; additionalChunkRuntimeRequirements: { tap: (arg0: string, arg1: (chunk: import("../Chunk"), set: { add: (arg0: typeof RuntimeGlobals) => void; }, { chunkGraph }: { chunkGraph: any; }) => void) => void; }; runtimeRequirementInTree: { for: (arg0: string) => { (): any; new (): any; tap: { (arg0: string, arg1: (chunk: any, set: any) => void): void; new (): any; }; }; }; }; addRuntimeModule: (arg0: import("../Chunk"), arg1: StartupChunkDependenciesRuntimeModule | StartupEntrypointRuntimeModule) => void; }} */ compilation) => {
				const globalChunkLoading = compilation.outputOptions.chunkLoading;
				/**
				 * @param {Chunk} chunk chunk to check
				 * @returns {boolean} true, when the plugin is enabled for the chunk
				 */
				const isEnabledForChunk = chunk => {
					const options = chunk.getEntryOptions();
					const chunkLoading =
						options && options.chunkLoading !== undefined
							? options.chunkLoading
							: globalChunkLoading;
					return chunkLoading === this.chunkLoading;
				};
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"StartupChunkDependenciesPlugin",
					(/** @type {import("../Chunk")} */ chunk, /** @type {{ add: (arg0: string) => void; }} */ set, { chunkGraph }) => {
						if (!isEnabledForChunk(chunk)) return;
						if (chunkGraph.hasChunkEntryDependentChunks(chunk)) {
							set.add(RuntimeGlobals.startup);
							set.add(RuntimeGlobals.ensureChunk);
							set.add(RuntimeGlobals.ensureChunkIncludeEntries);
							compilation.addRuntimeModule(
								chunk,
								new StartupChunkDependenciesRuntimeModule(
									this.asyncChunkLoading
								)
							);
						}
					}
				);
				compilation.hooks.additionalChunkRuntimeRequirements.tap(
					'MfStartupChunkDependenciesPlugin',
					(/** @type {import("../Chunk")} */ chunk, /** @type {{ add: (arg0: typeof RuntimeGlobals) => void; }} */ set, { chunkGraph }) => {
					  if (!isEnabledForChunk(chunk)) return;
					  if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return;
					  set.add(federationStartup);
					},
				  );
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.startupEntrypoint)
					.tap("StartupChunkDependenciesPlugin", (chunk, set) => {
						if (!isEnabledForChunk(chunk)) return;
						set.add(RuntimeGlobals.require);
						set.add(RuntimeGlobals.ensureChunk);
						set.add(RuntimeGlobals.ensureChunkIncludeEntries);
						compilation.addRuntimeModule(
							chunk,
							new StartupEntrypointRuntimeModule(this.asyncChunkLoading)
						);
					});
			}
		);
		const { renderStartup } =
          compiler.webpack.javascript.JavascriptModulesPlugin.getCompilationHooks(
            compilation,
          );

		renderStartup.tap(
			'MfStartupChunkDependenciesPlugin',
			(/** @type {any} */ startupSource, /** @type {any} */ lastInlinedModule, /** @type {{ chunk: any; chunkGraph: any; runtimeTemplate: any; }} */ renderContext) => {
			  const { chunk, chunkGraph, runtimeTemplate } = renderContext;
  
			  if (!isEnabledForChunk(chunk)) {
				return startupSource;
			  }
  
			  const treeRuntimeRequirements =
				chunkGraph.getTreeRuntimeRequirements(chunk);
			  const chunkRuntimeRequirements =
				chunkGraph.getChunkRuntimeRequirements(chunk);
  
			  const federation =
				chunkRuntimeRequirements.has(federationStartup) ||
				treeRuntimeRequirements.has(federationStartup);
  
			  if (!federation) {
				return startupSource;
			  }
  
			  const entryModules = Array.from(
				chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk),
			  );
  
			  const entryGeneration = runtimeTemplate.outputOptions.module
				? generateESMEntryStartup
				// @ts-ignore
				: generateEntryStartup;
  
			  return new compiler.webpack.sources.ConcatSource(
				entryGeneration(
				  compilation,
				  chunkGraph,
				  runtimeTemplate,
				  entryModules,
				  chunk,
				  false,
				),
			  );
			},
		  );
		},
	  );
	}
}

module.exports = StartupChunkDependenciesPlugin;
