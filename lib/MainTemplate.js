/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const util = require("util");
const RuntimeGlobals = require("./RuntimeGlobals");
const memorize = require("./util/memorize");

/** @typedef {import("webpack-sources").ConcatSource} ConcatSource */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").Output} OutputOptions */
/** @typedef {import("./ModuleTemplate")} ModuleTemplate */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Compilation").AssetInfo} AssetInfo */
/** @typedef {import("./Module")} Module} */
/** @typedef {import("./util/Hash")} Hash} */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates} */
/** @typedef {import("./ModuleTemplate").RenderContext} RenderContext} */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate} */
/** @typedef {import("./ModuleGraph")} ModuleGraph} */
/** @typedef {import("./ChunkGraph")} ChunkGraph} */
/** @typedef {import("./Template").RenderManifestOptions} RenderManifestOptions} */
/** @typedef {import("./Template").RenderManifestEntry} RenderManifestEntry} */

const getJavascriptModulesPlugin = memorize(() =>
	require("./javascript/JavascriptModulesPlugin")
);
const getJsonpTemplatePlugin = memorize(() =>
	require("./web/JsonpTemplatePlugin")
);
const getLoadScriptRuntimeModule = memorize(() =>
	require("./runtime/LoadScriptRuntimeModule")
);

// TODO webpack 6 remove this class
class MainTemplate {
	/**
	 *
	 * @param {OutputOptions} outputOptions output options for the MainTemplate
	 * @param {Compilation} compilation the compilation
	 */
	constructor(outputOptions, compilation) {
		/** @type {OutputOptions} */
		this._outputOptions = outputOptions || {};
		this.hooks = Object.freeze({
			renderManifest: {
				tap: util.deprecate(
					(options, fn) => {
						compilation.hooks.renderManifest.tap(
							options,
							(entries, options) => {
								if (!options.chunk.hasRuntime()) return entries;
								return fn(entries, options);
							}
						);
					},
					"MainTemplate.hooks.renderManifest is deprecated (use Compilation.hooks.renderManifest instead)",
					"DEP_WEBPACK_MAIN_TEMPLATE_RENDER_MANIFEST"
				)
			},
			modules: {
				tap: () => {
					throw new Error(
						"MainTemplate.hooks.modules has been removed (there is no replacement, please create an issue to request that)"
					);
				}
			},
			moduleObj: {
				tap: () => {
					throw new Error(
						"MainTemplate.hooks.moduleObj has been removed (there is no replacement, please create an issue to request that)"
					);
				}
			},
			require: {
				tap: util.deprecate(
					(options, fn) => {
						getJavascriptModulesPlugin()
							.getCompilationHooks(compilation)
							.renderRequire.tap(options, fn);
					},
					"MainTemplate.hooks.require is deprecated (use JavascriptModulesPlugin.getCompilationHooks().renderRequire instead)",
					"DEP_WEBPACK_MAIN_TEMPLATE_REQUIRE"
				)
			},
			beforeStartup: {
				tap: () => {
					throw new Error(
						"MainTemplate.hooks.beforeStartup has been removed (use RuntimeGlobals.startup instead)"
					);
				}
			},
			startup: {
				tap: () => {
					throw new Error(
						"MainTemplate.hooks.startup has been removed (use RuntimeGlobals.startup instead)"
					);
				}
			},
			afterStartup: {
				tap: () => {
					throw new Error(
						"MainTemplate.hooks.afterStartup has been removed (use RuntimeGlobals.startup instead)"
					);
				}
			},
			render: {
				tap: util.deprecate(
					(options, fn) => {
						getJavascriptModulesPlugin()
							.getCompilationHooks(compilation)
							.render.tap(options, (source, renderContext) => {
								if (
									renderContext.chunkGraph.getNumberOfEntryModules(
										renderContext.chunk
									) === 0 ||
									!renderContext.chunk.hasRuntime()
								) {
									return source;
								}
								return fn(
									source,
									renderContext.chunk,
									compilation.hash,
									compilation.moduleTemplates.javascript,
									compilation.dependencyTemplates
								);
							});
					},
					"MainTemplate.hooks.render is deprecated (use JavascriptModulesPlugin.getCompilationHooks().render instead)",
					"DEP_WEBPACK_MAIN_TEMPLATE_RENDER"
				)
			},
			renderWithEntry: {
				tap: util.deprecate(
					(options, fn) => {
						getJavascriptModulesPlugin()
							.getCompilationHooks(compilation)
							.render.tap(options, (source, renderContext) => {
								if (
									renderContext.chunkGraph.getNumberOfEntryModules(
										renderContext.chunk
									) === 0 ||
									!renderContext.chunk.hasRuntime()
								) {
									return source;
								}
								return fn(source, renderContext.chunk, compilation.hash);
							});
					},
					"MainTemplate.hooks.renderWithEntry is deprecated (use JavascriptModulesPlugin.getCompilationHooks().render instead)",
					"DEP_WEBPACK_MAIN_TEMPLATE_RENDER_WITH_ENTRY"
				)
			},
			assetPath: {
				tap: util.deprecate(
					(options, fn) => {
						compilation.hooks.assetPath.tap(options, fn);
					},
					"MainTemplate.hooks.assetPath is deprecated (use Compilation.hooks.assetPath instead)",
					"DEP_WEBPACK_MAIN_TEMPLATE_ASSET_PATH"
				),
				call: util.deprecate(
					(filename, options) => {
						return compilation.getAssetPath(filename, options);
					},
					"MainTemplate.hooks.assetPath is deprecated (use Compilation.hooks.assetPath instead)",
					"DEP_WEBPACK_MAIN_TEMPLATE_ASSET_PATH"
				)
			},
			hash: {
				tap: util.deprecate(
					(options, fn) => {
						compilation.hooks.fullHash.tap(options, fn);
					},
					"MainTemplate.hooks.hash is deprecated (use Compilation.hooks.fullHash instead)",
					"DEP_WEBPACK_MAIN_TEMPLATE_HASH"
				)
			},
			hashForChunk: {
				tap: util.deprecate(
					(options, fn) => {
						getJavascriptModulesPlugin()
							.getCompilationHooks(compilation)
							.chunkHash.tap(options, (chunk, hash) => {
								if (!chunk.hasRuntime()) return;
								return fn(hash, chunk);
							});
					},
					"MainTemplate.hooks.hashForChunk is deprecated (use JavascriptModulesPlugin.getCompilationHooks().chunkHash instead)",
					"DEP_WEBPACK_MAIN_TEMPLATE_HASH_FOR_CHUNK"
				)
			},
			globalHashPaths: {
				tap: util.deprecate(
					() => {},
					"MainTemplate.hooks.globalHashPaths has been removed (it's no longer needed)",
					"DEP_WEBPACK_MAIN_TEMPLATE_HASH_FOR_CHUNK"
				)
			},
			globalHash: {
				tap: util.deprecate(
					() => {},
					"MainTemplate.hooks.globalHash has been removed (it's no longer needed)",
					"DEP_WEBPACK_MAIN_TEMPLATE_HASH_FOR_CHUNK"
				)
			},
			hotBootstrap: {
				tap: () => {
					throw new Error(
						"MainTemplate.hooks.hotBootstrap has been removed (use your own RuntimeModule instead)"
					);
				}
			},

			// for compatibility:
			/** @type {SyncWaterfallHook<[string, Chunk, string, ModuleTemplate, DependencyTemplates]>} */
			bootstrap: new SyncWaterfallHook([
				"source",
				"chunk",
				"hash",
				"moduleTemplate",
				"dependencyTemplates"
			]),
			/** @type {SyncWaterfallHook<[string, Chunk, string]>} */
			localVars: new SyncWaterfallHook(["source", "chunk", "hash"]),
			/** @type {SyncWaterfallHook<[string, Chunk, string]>} */
			requireExtensions: new SyncWaterfallHook(["source", "chunk", "hash"]),
			/** @type {SyncWaterfallHook<[string, Chunk, string, string]>} */
			requireEnsure: new SyncWaterfallHook([
				"source",
				"chunk",
				"hash",
				"chunkIdExpression"
			]),
			get jsonpScript() {
				const hooks = getLoadScriptRuntimeModule().getCompilationHooks(
					compilation
				);
				return hooks.createScript;
			},
			get linkPrefetch() {
				const hooks = getJsonpTemplatePlugin().getCompilationHooks(compilation);
				return hooks.linkPrefetch;
			},
			get linkPreload() {
				const hooks = getJsonpTemplatePlugin().getCompilationHooks(compilation);
				return hooks.linkPreload;
			}
		});

		this.renderCurrentHashCode = util.deprecate(
			/**
			 * @deprecated
			 * @param {string} hash the hash
			 * @param {number=} length length of the hash
			 * @returns {string} generated code
			 */ (hash, length) => {
				if (length) {
					return `${RuntimeGlobals.getFullHash} ? ${
						RuntimeGlobals.getFullHash
					}().slice(0, ${length}) : ${hash.slice(0, length)}`;
				}
				return `${RuntimeGlobals.getFullHash} ? ${RuntimeGlobals.getFullHash}() : ${hash}`;
			},
			"MainTemplate.renderCurrentHashCode is deprecated (use RuntimeGlobals.getFullHash runtime function instead)",
			"DEP_WEBPACK_MAIN_TEMPLATE_RENDER_CURRENT_HASH_CODE"
		);

		this.getPublicPath = util.deprecate(
			/**
			 *
			 * @param {object} options get public path options
			 * @returns {string} hook call
			 */ options => {
				return compilation.getAssetPath(
					compilation.outputOptions.publicPath,
					options
				);
			},
			"MainTemplate.getPublicPath is deprecated (use Compilation.getAssetPath(compilation.outputOptions.publicPath, options) instead)",
			"DEP_WEBPACK_MAIN_TEMPLATE_GET_PUBLIC_PATH"
		);

		this.getAssetPath = util.deprecate(
			(path, options) => {
				return compilation.getAssetPath(path, options);
			},
			"MainTemplate.getAssetPath is deprecated (use Compilation.getAssetPath instead)",
			"DEP_WEBPACK_MAIN_TEMPLATE_GET_ASSET_PATH"
		);

		this.getAssetPathWithInfo = util.deprecate(
			(path, options) => {
				return compilation.getAssetPathWithInfo(path, options);
			},
			"MainTemplate.getAssetPathWithInfo is deprecated (use Compilation.getAssetPath instead)",
			"DEP_WEBPACK_MAIN_TEMPLATE_GET_ASSET_PATH_WITH_INFO"
		);
	}
}

Object.defineProperty(MainTemplate.prototype, "requireFn", {
	get: util.deprecate(
		() => "__webpack_require__",
		'MainTemplate.requireFn is deprecated (use "__webpack_require__")',
		"DEP_WEBPACK_MAIN_TEMPLATE_REQUIRE_FN"
	)
});

Object.defineProperty(MainTemplate.prototype, "outputOptions", {
	get: util.deprecate(
		/**
		 * @this {MainTemplate}
		 * @returns {OutputOptions} output options
		 */
		function () {
			return this._outputOptions;
		},
		"MainTemplate.outputOptions is deprecated (use Compilation.outputOptions instead)",
		"DEP_WEBPACK_MAIN_TEMPLATE_OUTPUT_OPTIONS"
	)
});

module.exports = MainTemplate;
