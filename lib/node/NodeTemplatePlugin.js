/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const {
	getChunkFilenameTemplate
} = require("../javascript/JavascriptModulesPlugin");
const StartupChunkDependenciesPlugin = require("../runtime/StartupChunkDependenciesPlugin");

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
			? require("./ReadFileChunkLoadingRuntimeModule")
			: require("./RequireChunkLoadingRuntimeModule");

		new StartupChunkDependenciesPlugin({
			asyncChunkLoading: this.asyncChunkLoading,
			exposedGlobal: "module.exports"
		}).apply(compiler);
		compiler.hooks.thisCompilation.tap("NodeTemplatePlugin", compilation => {
			const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
			hooks.renderChunk.tap("NodeTemplatePlugin", (modules, renderContext) => {
				const { chunk, chunkGraph, runtimeTemplate } = renderContext;
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
				}
				const entries = Array.from(
					chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
				);
				if (entries.length > 0) {
					const runtimeChunk = entries[0][1].getRuntimeChunk();
					const currentOutputName = compilation
						.getPath(
							getChunkFilenameTemplate(chunk, compilation.outputOptions),
							{
								chunk,
								contentHashType: "javascript"
							}
						)
						.split("/");
					const runtimeOutputName = compilation
						.getPath(
							getChunkFilenameTemplate(runtimeChunk, compilation.outputOptions),
							{
								chunk: runtimeChunk,
								contentHashType: "javascript"
							}
						)
						.split("/");

					// remove filename, we only need the directory
					currentOutputName.pop();

					// remove common parts
					while (
						currentOutputName.length > 0 &&
						runtimeOutputName.length > 0 &&
						currentOutputName[0] === runtimeOutputName[0]
					) {
						currentOutputName.shift();
						runtimeOutputName.shift();
					}

					// create final path
					const runtimePath =
						(currentOutputName.length > 0
							? "../".repeat(currentOutputName.length)
							: "./") + runtimeOutputName.join("/");

					const entrySource = new ConcatSource();
					entrySource.add(
						`(${
							runtimeTemplate.supportsArrowFunction() ? "() => " : "function() "
						}{\n`
					);
					entrySource.add("var exports = {};\n");
					entrySource.add(source);
					entrySource.add(";\n\n// load runtime\n");
					entrySource.add(
						`var __webpack_require__ = require(${JSON.stringify(
							runtimePath
						)});\n`
					);
					entrySource.add(`${RuntimeGlobals.externalInstallChunk}(exports);\n`);
					for (let i = 0; i < entries.length; i++) {
						const [module, entrypoint] = entries[i];
						entrySource.add(
							`${i === entries.length - 1 ? "return " : ""}${
								RuntimeGlobals.startupEntrypoint
							}(${JSON.stringify(
								entrypoint.chunks
									.filter(c => c !== chunk && c !== runtimeChunk)
									.map(c => c.id)
							)}, ${JSON.stringify(chunkGraph.getModuleId(module))});\n`
						);
					}
					entrySource.add("})()");
					return entrySource;
				}
				return source;
			});
			hooks.render.tap("NodeTemplatePlugin", (source, renderContext) => {
				const { chunk, chunkGraph } = renderContext;
				if (!chunk.hasRuntime()) return source;
				if (chunkGraph.getNumberOfEntryModules(chunk) > 0) return source;
				//	const result = new ConcatSource();
				//return result;
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

			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				"NodeTemplatePlugin",
				(chunk, set) => {
					if (
						Array.from(chunk.getAllReferencedChunks()).some(
							c =>
								c !== chunk &&
								compilation.chunkGraph.getNumberOfEntryModules(c) > 0
						)
					) {
						set.add(RuntimeGlobals.startupEntrypoint);
						set.add(RuntimeGlobals.externalInstallChunk);
					}
				}
			);
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
