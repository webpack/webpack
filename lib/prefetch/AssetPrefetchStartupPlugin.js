/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const getAssetType = require("../util/assetType");
const AssetPrefetchStartupRuntimeModule = require("./AssetPrefetchStartupRuntimeModule");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

/**
 * @typedef {object} AssetInfo
 * @property {string} url
 * @property {string} as
 * @property {string=} fetchPriority
 * @property {string=} type
 */

/**
 * @typedef {object} AssetPrefetchInfo
 * @property {AssetInfo[]} prefetch
 * @property {AssetInfo[]} preload
 */

const PLUGIN_NAME = "AssetPrefetchStartupPlugin";

class AssetPrefetchStartupPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const assetPrefetchMap = new WeakMap();
			const chunkAssetInfoMap = new WeakMap();

			// Hook into finishModules to collect all URLDependencies
			compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
				for (const module of modules) {
					if (!module.dependencies) continue;

					// Collect URLDependencies with prefetch/preload
					const assetDeps = [];
					for (const dep of module.dependencies) {
						if (dep.constructor.name === "URLDependency") {
							const urlDep =
								/** @type {import("../dependencies/URLDependency")} */ (dep);
							if (urlDep.prefetch || urlDep.preload) {
								assetDeps.push(urlDep);
							}
						}
					}

					if (assetDeps.length > 0) {
						assetPrefetchMap.set(module, assetDeps);
					}
				}
			});

			// Process assets when chunks are being optimized
			compilation.hooks.optimizeChunks.tap(
				{ name: PLUGIN_NAME, stage: 1 },
				(chunks) => {
					const chunkGraph = compilation.chunkGraph;
					const moduleGraph = compilation.moduleGraph;

					for (const chunk of chunks) {
						const assetInfo = {
							prefetch: /** @type {AssetInfo[]} */ ([]),
							preload: /** @type {AssetInfo[]} */ ([])
						};

						// Process all modules in this chunk
						for (const module of chunkGraph.getChunkModules(chunk)) {
							const urlDeps = assetPrefetchMap.get(module);
							if (!urlDeps) continue;

							for (const dep of urlDeps) {
								// Mark dependency as handled by startup prefetch
								dep._startupPrefetch = true;

								const resolvedModule = moduleGraph.getModule(dep);
								if (!resolvedModule) continue;

								const request = /** @type {{ request?: string }} */ (
									resolvedModule
								).request;
								if (!request) continue;

								// Get the actual asset filename from module buildInfo
								let assetUrl;
								if (
									resolvedModule.buildInfo &&
									resolvedModule.buildInfo.filename
								) {
									assetUrl = resolvedModule.buildInfo.filename;
								} else {
									// Fallback to extracting from request
									assetUrl = request.split(/[\\/]/).pop() || request;
								}

								const assetType = getAssetType(request);
								const info = {
									url: assetUrl,
									as: assetType,
									fetchPriority: dep.fetchPriority,
									type: dep.preloadType
								};

								if (dep.prefetch && !dep.preload) {
									assetInfo.prefetch.push(info);
								} else if (dep.preload) {
									assetInfo.preload.push(info);
								}
							}
						}

						if (assetInfo.prefetch.length > 0 || assetInfo.preload.length > 0) {
							const existing = chunkAssetInfoMap.get(chunk);
							if (!existing) {
								chunkAssetInfoMap.set(chunk, assetInfo);
							} else {
								existing.prefetch.push(...assetInfo.prefetch);
								existing.preload.push(...assetInfo.preload);
							}
						}
					}
				}
			);

			compilation.hooks.additionalChunkRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set) => {
					const assetInfo = chunkAssetInfoMap.get(chunk);
					if (!assetInfo) return;

					const { prefetch, preload } = assetInfo;

					if (prefetch.length > 0) {
						set.add(RuntimeGlobals.prefetchAsset);
					}

					if (preload.length > 0) {
						set.add(RuntimeGlobals.preloadAsset);
					}

					if (prefetch.length > 0 || preload.length > 0) {
						compilation.addRuntimeModule(
							chunk,
							new AssetPrefetchStartupRuntimeModule(assetInfo)
						);
					}
				}
			);

			// Ensure runtime functions are available
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.prefetchAsset)
				.tap(PLUGIN_NAME, (chunk, set) => {
					// AssetPrefetchPreloadRuntimeModule will be added by URLParserPlugin
					set.add(RuntimeGlobals.publicPath);
				});

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.preloadAsset)
				.tap(PLUGIN_NAME, (chunk, set) => {
					// AssetPrefetchPreloadRuntimeModule will be added by URLParserPlugin
					set.add(RuntimeGlobals.publicPath);
				});
		});
	}
}

module.exports = AssetPrefetchStartupPlugin;
