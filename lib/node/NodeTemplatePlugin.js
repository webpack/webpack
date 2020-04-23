/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const ReadFileChunkLoadingRuntimeModule = require("./ReadFileChunkLoadingRuntimeModule");
const RequireChunkLoadingRuntimeModule = require("./RequireChunkLoadingRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

class NodeTemplatePlugin {
	constructor(options) {
		options = options || {};
		this.asyncChunkLoading = options.asyncChunkLoading;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const ChunkLoadingRuntimeModule = this.asyncChunkLoading
			? ReadFileChunkLoadingRuntimeModule
			: RequireChunkLoadingRuntimeModule;

		compiler.hooks.thisCompilation.tap("NodeTemplatePlugin", compilation => {
			const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
			hooks.renderChunk.tap("NodeTemplatePlugin", (modules, renderContext) => {
				const { chunk, chunkGraph } = renderContext;
				const source = new ConcatSource();
				source.add(`exports.id = ${JSON.stringify(chunk.id)};\n`);
				source.add(`exports.ids = ${JSON.stringify(chunk.ids)};\n`);
				source.add(`exports.modules = `);
				source.add(modules);
				source.add(";\n");
				const runtimeModules = chunkGraph.getChunkRuntimeModulesInOrder(chunk);
				if (runtimeModules.length > 0) {
					source.add("exports.runtime =\n");
					source.add(
						Template.renderChunkRuntimeModules(runtimeModules, renderContext)
					);
					source.add(";\n");
				}
				return source;
			});
			hooks.chunkHash.tap("NodeTemplatePlugin", (chunk, hash) => {
				if (chunk.hasRuntime()) return;
				hash.update("node");
				hash.update("1");
			});

			const onceForChunkSet = new WeakSet();
			const handler = (chunk, set) => {
				if (onceForChunkSet.has(chunk)) return;
				onceForChunkSet.add(chunk);
				set.add(RuntimeGlobals.moduleFactoriesAddOnly);
				set.add(RuntimeGlobals.hasOwnProperty);
				compilation.addRuntimeModule(chunk, new ChunkLoadingRuntimeModule(set));
			};

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap("NodeTemplatePlugin", handler);
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
				.tap("NodeTemplatePlugin", handler);
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadManifest)
				.tap("NodeTemplatePlugin", handler);

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap("NodeTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.getChunkScriptFilename);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
				.tap("NodeTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.getChunkUpdateScriptFilename);
					set.add(RuntimeGlobals.moduleCache);
					set.add(RuntimeGlobals.hmrModuleData);
					set.add(RuntimeGlobals.moduleFactoriesAddOnly);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadManifest)
				.tap("NodeTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.getUpdateManifestFilename);
				});
		});
	}
}

module.exports = NodeTemplatePlugin;
