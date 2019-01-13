/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const Compilation = require("../Compilation");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const JsonpChunkLoadingRuntimeModule = require("./JsonpChunkLoadingRuntimeModule");
const JsonpChunkTemplatePlugin = require("./JsonpChunkTemplatePlugin");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */

/**
 * @typedef {Object} JsonpCompilationPluginHooks
 * @property {SyncWaterfallHook<string, Chunk, string>} jsonpScript
 * @property {SyncWaterfallHook<string, Chunk, string>} linkPreload
 * @property {SyncWaterfallHook<string, Chunk, string>} linkPrefetch
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
				"The 'compilation' argument must be an instance of MainTemplate"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				jsonpScript: new SyncWaterfallHook(["source", "chunk", "hash"]),
				linkPreload: new SyncWaterfallHook(["source", "chunk", "hash"]),
				linkPrefetch: new SyncWaterfallHook(["source", "chunk", "hash"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("JsonpTemplatePlugin", compilation => {
			new JsonpChunkTemplatePlugin(compilation).apply(
				compilation.chunkTemplate
			);
			const mainTemplate = compilation.mainTemplate;
			const needEntryDeferringCode = chunk => {
				for (const chunkGroup of chunk.groupsIterable) {
					if (chunkGroup.chunks.length > 1) return true;
				}
				return false;
			};

			const {
				jsonpScript,
				linkPreload,
				linkPrefetch
			} = JsonpTemplatePlugin.getCompilationHooks(compilation);

			jsonpScript.tap("JsonpTemplatePlugin", (_, chunk, hash) => {
				const crossOriginLoading =
					mainTemplate.outputOptions.crossOriginLoading;
				const chunkLoadTimeout = mainTemplate.outputOptions.chunkLoadTimeout;
				const jsonpScriptType = mainTemplate.outputOptions.jsonpScriptType;

				return Template.asString([
					"var script = document.createElement('script');",
					"var onScriptComplete;",
					jsonpScriptType
						? `script.type = ${JSON.stringify(jsonpScriptType)};`
						: "",
					"script.charset = 'utf-8';",
					`script.timeout = ${chunkLoadTimeout / 1000};`,
					`if (${RuntimeGlobals.scriptNonce}) {`,
					Template.indent(
						`script.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
					),
					"}",
					`script.src = url;`,
					crossOriginLoading
						? Template.asString([
								"if (script.src.indexOf(window.location.origin + '/') !== 0) {",
								Template.indent(
									`script.crossOrigin = ${JSON.stringify(crossOriginLoading)};`
								),
								"}"
						  ])
						: "",
					"onScriptComplete = function (event) {",
					Template.indent([
						"// avoid mem leaks in IE.",
						"script.onerror = script.onload = null;",
						"clearTimeout(timeout);",
						"var reportError = loadingEnded();",
						"if(reportError) {",
						Template.indent([
							"var errorType = event && (event.type === 'load' ? 'missing' : event.type);",
							"var realSrc = event && event.target && event.target.src;",
							"var error = new Error('Loading chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realSrc + ')');",
							"error.type = errorType;",
							"error.request = realSrc;",
							"reportError(error);"
						]),
						"}"
					]),
					"};",
					"var timeout = setTimeout(function(){",
					Template.indent([
						"onScriptComplete({ type: 'timeout', target: script });"
					]),
					`}, ${chunkLoadTimeout});`,
					"script.onerror = script.onload = onScriptComplete;"
				]);
			});
			linkPreload.tap("JsonpTemplatePlugin", (_, chunk, hash) => {
				const crossOriginLoading =
					mainTemplate.outputOptions.crossOriginLoading;
				const jsonpScriptType = mainTemplate.outputOptions.jsonpScriptType;

				return Template.asString([
					"var link = document.createElement('link');",
					jsonpScriptType
						? `link.type = ${JSON.stringify(jsonpScriptType)};`
						: "",
					"link.charset = 'utf-8';",
					`if (${RuntimeGlobals.scriptNonce}) {`,
					Template.indent(
						`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
					),
					"}",
					'link.rel = "preload";',
					'link.as = "script";',
					`link.href = ${RuntimeGlobals.publicPath} + ${
						RuntimeGlobals.getChunkScriptFilename
					}(chunkId);`,
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
				const crossOriginLoading =
					mainTemplate.outputOptions.crossOriginLoading;

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
					`link.href = ${RuntimeGlobals.publicPath} + ${
						RuntimeGlobals.getChunkScriptFilename
					}(chunkId);`
				]);
			});

			const onceForChunkSet = new WeakSet();
			const handler = (chunk, set) => {
				if (onceForChunkSet.has(chunk)) return;
				onceForChunkSet.add(chunk);
				set.add(RuntimeGlobals.moduleFactories);
				compilation.addRuntimeModule(
					chunk,
					new JsonpChunkLoadingRuntimeModule(
						chunk,
						compilation.chunkGraph,
						compilation.outputOptions,
						set,
						jsonpScript,
						linkPreload,
						linkPrefetch
					)
				);
			};
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
					set.add(RuntimeGlobals.getChunkScriptFilename);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
				.tap("JsonpTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.getChunkUpdateScriptFilename);
					set.add(RuntimeGlobals.moduleCache);
					set.add(RuntimeGlobals.hmrModuleData);
					set.add(RuntimeGlobals.moduleFactories);
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
					if (needEntryDeferringCode(chunk)) {
						set.add(RuntimeGlobals.startup);
						set.add(RuntimeGlobals.startupNoDefault);
						handler(chunk, set);
					}
				}
			);
		});
	}
}

module.exports = JsonpTemplatePlugin;
