/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const { ConcatSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const HotUpdateChunk = require("../HotUpdateChunk");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const chunkHasJs = require("../javascript/JavascriptModulesPlugin").chunkHasJs;
const JsonpChunkLoadingRuntimeModule = require("./JsonpChunkLoadingRuntimeModule");
const { getEntryInfo, needEntryDeferringCode } = require("./JsonpHelpers");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */

/**
 * @typedef {Object} JsonpCompilationPluginHooks
 * @property {SyncWaterfallHook<[string, Chunk, string]>} linkPreload
 * @property {SyncWaterfallHook<[string, Chunk, string]>} linkPrefetch
 */

/** @type {WeakMap<Compilation, JsonpCompilationPluginHooks>} */
const compilationHooksMap = new WeakMap();

class JsonpTemplatePlugin {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {JsonpCompilationPluginHooks} hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				linkPreload: new SyncWaterfallHook(["source", "chunk", "hash"]),
				linkPrefetch: new SyncWaterfallHook(["source", "chunk", "hash"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("JsonpTemplatePlugin", compilation => {
			const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
			hooks.renderChunk.tap("JsonpTemplatePlugin", (modules, renderContext) => {
				const { chunk, chunkGraph, runtimeTemplate } = renderContext;
				const hotUpdateChunk = chunk instanceof HotUpdateChunk ? chunk : null;
				const globalObject = runtimeTemplate.outputOptions.globalObject;
				const source = new ConcatSource();
				const runtimeModules = chunkGraph.getChunkRuntimeModulesInOrder(chunk);
				const runtimePart =
					runtimeModules.length > 0 &&
					Template.renderChunkRuntimeModules(runtimeModules, renderContext);
				if (hotUpdateChunk) {
					const jsonpFunction = runtimeTemplate.outputOptions.hotUpdateFunction;
					source.add(`${globalObject}[${JSON.stringify(jsonpFunction)}](`);
					source.add(`${JSON.stringify(chunk.id)},`);
					source.add(modules);
					if (runtimePart) {
						source.add(",\n");
						source.add(runtimePart);
					}
					source.add(")");
				} else {
					const jsonpFunction = runtimeTemplate.outputOptions.jsonpFunction;
					source.add(
						`(${globalObject}[${JSON.stringify(
							jsonpFunction
						)}] = ${globalObject}[${JSON.stringify(
							jsonpFunction
						)}] || []).push([`
					);
					source.add(`${JSON.stringify(chunk.ids)},`);
					source.add(modules);
					const entries = getEntryInfo(chunkGraph, chunk, c =>
						chunkHasJs(c, chunkGraph)
					);
					const entriesPart =
						entries.length > 0 && `,${JSON.stringify(entries)}`;
					if (entriesPart || runtimePart) {
						source.add(entriesPart || ",0");
					}
					if (runtimePart) {
						source.add(",\n");
						source.add(runtimePart);
					}
					source.add("])");
				}
				return source;
			});
			hooks.chunkHash.tap(
				"JsonpTemplatePlugin",
				(chunk, hash, { chunkGraph, runtimeTemplate }) => {
					if (chunk.hasRuntime()) return;
					hash.update("JsonpTemplatePlugin");
					hash.update("1");
					hash.update(
						JSON.stringify(
							getEntryInfo(chunkGraph, chunk, c => chunkHasJs(c, chunkGraph))
						)
					);
					hash.update(`${runtimeTemplate.outputOptions.jsonpFunction}`);
					hash.update(`${runtimeTemplate.outputOptions.hotUpdateFunction}`);
					hash.update(`${runtimeTemplate.outputOptions.globalObject}`);
				}
			);

			const {
				linkPreload,
				linkPrefetch
			} = JsonpTemplatePlugin.getCompilationHooks(compilation);

			linkPreload.tap("JsonpTemplatePlugin", (_, chunk, hash) => {
				const { crossOriginLoading, scriptType } = compilation.outputOptions;

				return Template.asString([
					"var link = document.createElement('link');",
					scriptType ? `link.type = ${JSON.stringify(scriptType)};` : "",
					"link.charset = 'utf-8';",
					`if (${RuntimeGlobals.scriptNonce}) {`,
					Template.indent(
						`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
					),
					"}",
					'link.rel = "preload";',
					'link.as = "script";',
					`link.href = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkScriptFilename}(chunkId);`,
					crossOriginLoading
						? Template.asString([
								"if (link.href.indexOf(window.location.origin + '/') !== 0) {",
								Template.indent(
									`link.crossOrigin = ${JSON.stringify(crossOriginLoading)};`
								),
								"}"
						  ])
						: ""
				]);
			});
			linkPrefetch.tap("JsonpTemplatePlugin", (_, chunk, hash) => {
				const { crossOriginLoading } = compilation.outputOptions;

				return Template.asString([
					"var link = document.createElement('link');",
					crossOriginLoading
						? `link.crossOrigin = ${JSON.stringify(crossOriginLoading)};`
						: "",
					`if (${RuntimeGlobals.scriptNonce}) {`,
					Template.indent(
						`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
					),
					"}",
					'link.rel = "prefetch";',
					'link.as = "script";',
					`link.href = ${RuntimeGlobals.publicPath} + ${RuntimeGlobals.getChunkScriptFilename}(chunkId);`
				]);
			});

			const onceForChunkSet = new WeakSet();
			const handler = (chunk, set) => {
				if (onceForChunkSet.has(chunk)) return;
				onceForChunkSet.add(chunk);
				set.add(RuntimeGlobals.moduleFactoriesAddOnly);
				set.add(RuntimeGlobals.hasOwnProperty);
				compilation.addRuntimeModule(
					chunk,
					new JsonpChunkLoadingRuntimeModule(set, linkPreload, linkPrefetch)
				);
			};
			RuntimeGlobals.ensureChunkHandlers;
			RuntimeGlobals.hmrDownloadUpdateHandlers;
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap("JsonpTemplatePlugin", handler);
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
				.tap("JsonpTemplatePlugin", handler);
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadManifest)
				.tap("JsonpTemplatePlugin", handler);

			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap("JsonpTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.loadScript);
					set.add(RuntimeGlobals.getChunkScriptFilename);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
				.tap("JsonpTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.loadScript);
					set.add(RuntimeGlobals.getChunkUpdateScriptFilename);
					set.add(RuntimeGlobals.moduleCache);
					set.add(RuntimeGlobals.hmrModuleData);
					set.add(RuntimeGlobals.moduleFactoriesAddOnly);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadManifest)
				.tap("JsonpTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.getUpdateManifestFilename);
				});

			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				"JsonpTemplatePlugin",
				(chunk, set) => {
					const withDefer = needEntryDeferringCode(compilation, chunk);
					if (withDefer) {
						set.add(RuntimeGlobals.startup);
						set.add(RuntimeGlobals.startupNoDefault);
						handler(chunk, set);
					}
					if (withDefer) {
						set.add(RuntimeGlobals.require);
					}
				}
			);
		});
	}
}

module.exports = JsonpTemplatePlugin;
