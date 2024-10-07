/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const { AsyncDependenciesBlock, ExternalModule } = require("webpack");
const { STAGE_ADVANCED } = require("../OptimizationStages");
const { forEachRuntime } = require("../util/runtime");
const ModuleFederationPlugin = require("./ModuleFederationPlugin");

const PLUGIN_NAME = "HoistContainerReferences";

/**
 * This class is used to hoist container references in the code.
 */
class HoistContainerReferences {
	/**
	 * Apply the plugin to the compiler.
	 * @param {import("webpack").Compiler} compiler The webpack compiler instance.
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, compilation => {
			const hooks = ModuleFederationPlugin.getCompilationHooks(compilation);
			const containerEntryDependencies = new Set();
			hooks.addContainerEntryDependency.tap(PLUGIN_NAME, dep => {
				containerEntryDependencies.add(dep);
			});
			hooks.addFederationRuntimeDependency.tap(PLUGIN_NAME, dep => {
				containerEntryDependencies.add(dep);
			});

			// Hook into the optimizeChunks phase
			compilation.hooks.optimizeChunks.tap(
				{
					name: PLUGIN_NAME,
					// advanced stage is where SplitChunksPlugin runs.
					stage: STAGE_ADVANCED + 1
				},
				chunks => {
					this.hoistModulesInChunks(compilation, containerEntryDependencies);
				}
			);
		});
	}

	/**
	 * Hoist modules in chunks.
	 * @param {import("../Compilation")} compilation The webpack compilation instance.
	 * @param {Set<import("../Dependency")>} containerEntryDependencies Set of container entry dependencies.
	 */
	hoistModulesInChunks(compilation, containerEntryDependencies) {
		const { chunkGraph, moduleGraph } = compilation;
		// when runtimeChunk: single is set - ContainerPlugin will create a "partial" chunk we can use to
		// move modules into the runtime chunk
		for (const dep of containerEntryDependencies) {
			const containerEntryModule = moduleGraph.getModule(dep);
			if (!containerEntryModule) continue;
			const allReferencedModules = getAllReferencedModules(
				compilation,
				containerEntryModule,
				"initial"
			);

			const allRemoteReferences = getAllReferencedModules(
				compilation,
				containerEntryModule,
				"external"
			);

			for (const remote of allRemoteReferences) {
				allReferencedModules.add(remote);
			}

			const containerRuntimes =
				chunkGraph.getModuleRuntimes(containerEntryModule);
			const runtimes = new Set();

			for (const runtimeSpec of containerRuntimes) {
				forEachRuntime(runtimeSpec, runtimeKey => {
					if (runtimeKey) {
						runtimes.add(runtimeKey);
					}
				});
			}

			for (const runtime of runtimes) {
				const runtimeChunk = compilation.namedChunks.get(runtime);
				if (!runtimeChunk) continue;

				for (const module of allReferencedModules) {
					if (!chunkGraph.isModuleInChunk(module, runtimeChunk)) {
						chunkGraph.connectChunkAndModule(runtimeChunk, module);
					}
				}
			}
			this.cleanUpChunks(compilation, allReferencedModules);
		}
	}

	/**
	 * Clean up chunks by disconnecting unused modules.
	 * @param {import("../Compilation")} compilation The webpack compilation instance.
	 * @param {Set<import("../Module")>} modules Set of modules to clean up.
	 */
	cleanUpChunks(compilation, modules) {
		const { chunkGraph } = compilation;
		for (const module of modules) {
			for (const chunk of chunkGraph.getModuleChunks(module)) {
				if (!chunk.hasRuntime()) {
					chunkGraph.disconnectChunkAndModule(chunk, module);
					if (
						chunkGraph.getNumberOfChunkModules(chunk) === 0 &&
						chunkGraph.getNumberOfEntryModules(chunk) === 0
					) {
						chunkGraph.disconnectChunk(chunk);
						compilation.chunks.delete(chunk);
						if (chunk.name) {
							compilation.namedChunks.delete(chunk.name);
						}
					}
				}
			}
		}
		modules.clear();
	}

	/**
	 * Helper method to get runtime chunks from the compilation.
	 * @param {import("../Compilation")} compilation The webpack compilation instance.
	 * @returns {Set<import("../Chunk")>} Set of runtime chunks.
	 */
	getRuntimeChunks(compilation) {
		const runtimeChunks = new Set();
		const entries = compilation.entrypoints;

		for (const entrypoint of entries.values()) {
			const runtimeChunk = entrypoint.getRuntimeChunk();
			if (runtimeChunk) {
				runtimeChunks.add(runtimeChunk);
			}
		}
		return runtimeChunks;
	}
}

/**
 * Helper method to collect all referenced modules recursively.
 * @param {import("../Compilation")} compilation The webpack compilation instance.
 * @param {import("../Module")} module The module to start collecting from.
 * @param {string} type The type of modules to collect ("initial", "external", or "all").
 * @returns {Set<import("../Module")>} Set of collected modules.
 */
function getAllReferencedModules(compilation, module, type) {
	const collectedModules = new Set([module]);
	const visitedModules = new WeakSet([module]);
	const stack = [module];

	while (stack.length > 0) {
		const currentModule = stack.pop();
		if (!currentModule) continue;

		const outgoingConnections =
			compilation.moduleGraph.getOutgoingConnections(currentModule);
		if (outgoingConnections) {
			for (const connection of outgoingConnections) {
				const connectedModule = connection.module;

				// Skip if module has already been visited
				if (!connectedModule || visitedModules.has(connectedModule)) {
					continue;
				}

				// Handle 'initial' type (skipping async blocks)
				if (type === "initial") {
					const parentBlock = compilation.moduleGraph.getParentBlock(
						connection.dependency
					);
					if (parentBlock instanceof AsyncDependenciesBlock) {
						continue;
					}
				}

				// Handle 'external' type (collecting only external modules)
				if (type === "external") {
					if (connection.module instanceof ExternalModule) {
						collectedModules.add(connectedModule);
					}
				} else {
					// Handle 'all' or unspecified types
					collectedModules.add(connectedModule);
				}

				// Add connected module to the stack and mark it as visited
				visitedModules.add(connectedModule);
				stack.push(connectedModule);
			}
		}
	}

	return collectedModules;
}

module.exports = HoistContainerReferences;
