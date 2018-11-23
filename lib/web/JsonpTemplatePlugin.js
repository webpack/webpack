/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const Compilation = require("../Compilation");
const HotModuleReplacementPlugin = require("../HotModuleReplacementPlugin");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const JsonpChunkLoadingRuntimeModule = require("./JsonpChunkLoadingRuntimeModule");
const JsonpChunkTemplatePlugin = require("./JsonpChunkTemplatePlugin");
const JsonpHotUpdateChunkTemplatePlugin = require("./JsonpHotUpdateChunkTemplatePlugin");

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
			new JsonpHotUpdateChunkTemplatePlugin().apply(
				compilation.hotUpdateChunkTemplate
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

			const { hotBootstrap } = HotModuleReplacementPlugin.getMainTemplateHooks(
				mainTemplate
			);

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
					`script.src = ${RuntimeGlobals.publicPath} + ${
						RuntimeGlobals.getChunkScriptFilename
					}(chunkId);`,
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
						"var chunk = installedChunks[chunkId];",
						"if(chunk !== 0) {",
						Template.indent([
							"if(chunk) {",
							Template.indent([
								"var errorType = event && (event.type === 'load' ? 'missing' : event.type);",
								"var realSrc = event && event.target && event.target.src;",
								"var error = new Error('Loading chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realSrc + ')');",
								"error.type = errorType;",
								"error.request = realSrc;",
								"chunk[1](error);"
							]),
							"}",
							"installedChunks[chunkId] = undefined;"
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
				.for(RuntimeGlobals.startup)
				.tap("JsonpTemplatePlugin", handler);
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap("JsonpTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.getChunkScriptFilename);
					set.add(RuntimeGlobals.publicPath);
				});

			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				"JsonpTemplatePlugin",
				(chunk, set) => {
					if (needEntryDeferringCode(chunk)) {
						set.add(RuntimeGlobals.startup);
					}
				}
			);

			hotBootstrap.tap("JsonpTemplatePlugin", (source, chunk, hash) => {
				const globalObject = mainTemplate.outputOptions.globalObject;
				const hotUpdateChunkFilename =
					mainTemplate.outputOptions.hotUpdateChunkFilename;
				const hotUpdateMainFilename =
					mainTemplate.outputOptions.hotUpdateMainFilename;
				const crossOriginLoading =
					mainTemplate.outputOptions.crossOriginLoading;
				const hotUpdateFunction = mainTemplate.outputOptions.hotUpdateFunction;
				const currentHotUpdateChunkFilename = mainTemplate.getAssetPath(
					JSON.stringify(hotUpdateChunkFilename),
					{
						hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
						hashWithLength: length =>
							`" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
						chunk: {
							id: '" + chunkId + "'
						}
					}
				);
				const currentHotUpdateMainFilename = mainTemplate.getAssetPath(
					JSON.stringify(hotUpdateMainFilename),
					{
						hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
						hashWithLength: length =>
							`" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`
					}
				);
				const runtimeSource = Template.getFunctionContent(
					require("./JsonpMainTemplate.runtime")
				)
					.replace(/\/\/\$semicolon/g, ";")
					.replace(
						/\$crossOriginLoading\$/g,
						crossOriginLoading ? JSON.stringify(crossOriginLoading) : "null"
					)
					.replace(/\$$publicPath$\$/g, RuntimeGlobals.publicPath)
					.replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
					.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename)
					.replace(/\$hash\$/g, JSON.stringify(hash));
				return `${source}
	function hotDisposeChunk(chunkId) {
		delete installedChunks[chunkId];
	}
	var parentHotUpdateCallback = ${globalObject}[${JSON.stringify(
					hotUpdateFunction
				)}];
	${globalObject}[${JSON.stringify(hotUpdateFunction)}] = ${runtimeSource}`;
			});
			mainTemplate.hooks.hash.tap("JsonpTemplatePlugin", hash => {
				hash.update("jsonp");
				hash.update("6");
			});
		});
	}
}

module.exports = JsonpTemplatePlugin;
