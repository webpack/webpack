/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const HotUpdateChunk = require("../HotUpdateChunk");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const StartupChunkDependenciesPlugin = require("../runtime/StartupChunkDependenciesPlugin");
const ImportScriptsChunkLoadingRuntimeModule = require("./ImportScriptsChunkLoadingRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

class WebWorkerTemplatePlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		new StartupChunkDependenciesPlugin({
			asyncChunkLoading: true
		}).apply(compiler);
		compiler.hooks.thisCompilation.tap(
			"WebWorkerTemplatePlugin",
			compilation => {
				const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
				hooks.renderChunk.tap(
					"WebWorkerTemplatePlugin",
					(modules, renderContext) => {
						const { chunk, chunkGraph, runtimeTemplate } = renderContext;
						const hotUpdateChunk =
							chunk instanceof HotUpdateChunk ? chunk : null;
						const globalObject = runtimeTemplate.outputOptions.globalObject;
						const source = new ConcatSource();
						const runtimeModules = chunkGraph.getChunkRuntimeModulesInOrder(
							chunk
						);
						const runtimePart =
							runtimeModules.length > 0 &&
							Template.renderChunkRuntimeModules(runtimeModules, renderContext);
						if (hotUpdateChunk) {
							const jsonpFunction =
								runtimeTemplate.outputOptions.hotUpdateFunction;
							source.add(`${globalObject}[${JSON.stringify(jsonpFunction)}](`);
							source.add(modules);
							if (runtimePart) {
								source.add(",\n");
								source.add(runtimePart);
							}
							source.add(")");
						} else {
							const chunkCallbackName =
								runtimeTemplate.outputOptions.chunkCallbackName;
							source.add(
								`${globalObject}[${JSON.stringify(chunkCallbackName)}](`
							);
							source.add(`${JSON.stringify(chunk.ids)},`);
							source.add(modules);
							if (runtimePart) {
								source.add(",\n");
								source.add(runtimePart);
							}
							source.add(")");
						}
						return source;
					}
				);
				hooks.chunkHash.tap(
					"WebWorkerTemplatePlugin",
					(chunk, hash, { runtimeTemplate }) => {
						if (chunk.hasRuntime()) return;
						hash.update("webworker");
						hash.update("1");
						hash.update(`${runtimeTemplate.outputOptions.chunkCallbackName}`);
						hash.update(`${runtimeTemplate.outputOptions.hotUpdateFunction}`);
						hash.update(`${runtimeTemplate.outputOptions.globalObject}`);
					}
				);

				const onceForChunkSet = new WeakSet();
				const handler = (chunk, set) => {
					if (onceForChunkSet.has(chunk)) return;
					onceForChunkSet.add(chunk);
					set.add(RuntimeGlobals.moduleFactoriesAddOnly);
					set.add(RuntimeGlobals.hasOwnProperty);
					compilation.addRuntimeModule(
						chunk,
						new ImportScriptsChunkLoadingRuntimeModule(set)
					);
				};
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap("WebWorkerTemplatePlugin", handler);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
					.tap("WebWorkerTemplatePlugin", handler);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadManifest)
					.tap("WebWorkerTemplatePlugin", handler);

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap("WebWorkerTemplatePlugin", (chunk, set) => {
						set.add(RuntimeGlobals.publicPath);
						set.add(RuntimeGlobals.getChunkScriptFilename);
					});
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
					.tap("WebWorkerTemplatePlugin", (chunk, set) => {
						set.add(RuntimeGlobals.publicPath);
						set.add(RuntimeGlobals.getChunkUpdateScriptFilename);
						set.add(RuntimeGlobals.moduleCache);
						set.add(RuntimeGlobals.hmrModuleData);
						set.add(RuntimeGlobals.moduleFactoriesAddOnly);
					});
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadManifest)
					.tap("WebWorkerTemplatePlugin", (chunk, set) => {
						set.add(RuntimeGlobals.publicPath);
						set.add(RuntimeGlobals.getUpdateManifestFilename);
					});
			}
		);
	}
}
module.exports = WebWorkerTemplatePlugin;
