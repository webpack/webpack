/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { generateEntryStartup } = require("../javascript/StartupHelpers");
const RuntimeGlobals = require("../RuntimeGlobals");
const StartupChunkDependenciesRuntimeModule = require("./StartupChunkDependenciesRuntimeModule");
const StartupEntrypointRuntimeModule = require("./StartupEntrypointRuntimeModule");
const federationStartup=RuntimeGlobals.require;

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
			"StartupChunkDependenciesPlugin",
			compilation => {
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
					(chunk, set, { chunkGraph }) => {
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
					(chunk, set, { chunkGraph }) => {
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
					},
				);
				
				const { renderStartup } =
          		compiler.webpack.javascript.JavascriptModulesPlugin.getCompilationHooks(
           		 compilation,
          		);

        		renderStartup.tap(
          		'MfStartupChunkDependenciesPlugin',
          		(startupSource, lastInlinedModule, renderContext) => {
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
              // @ts-ignore
              ? generateESMEntryStartup
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
function isEnabledForChunk(chunk) {
	throw new Error("Function not implemented.");
}

