/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import util from "node:util";
import memoize from "./util/memoize.js";

const require = createRequire(import.meta.url);
/** @typedef {import("tapable").Tap} Tap */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Chunk.js").default} Chunk */
/** @typedef {import("./Compilation.js").default} Compilation */
/** @typedef {import("./DependencyTemplates.js").default} DependencyTemplates */
/** @typedef {import("./Module.js").default} Module */
/** @typedef {import("./RuntimeTemplate.js").default} RuntimeTemplate */
/** @typedef {import("./javascript/JavascriptModulesPlugin.js").ChunkRenderContext} ChunkRenderContext */
/** @typedef {import("./javascript/JavascriptModulesPlugin.js").ModuleRenderContext}  ModuleRenderContext */
/** @typedef {import("./util/Hash.js").default} Hash */

/**
 * Defines the if set type used by this module.
 * @template T
 * @typedef {import("tapable").IfSet<T>} IfSet
 */

const getJavascriptModulesPlugin = memoize(
	() =>
		/** @type {typeof import("./javascript/JavascriptModulesPlugin.js").default} */ (
			require("./javascript/JavascriptModulesPlugin.js")
		)
);

// TODO webpack 6: remove this class
class ModuleTemplate {
	/**
	 * Creates an instance of ModuleTemplate.
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {Compilation} compilation the compilation
	 */
	constructor(runtimeTemplate, compilation) {
		/** @type {RuntimeTemplate} */
		this._runtimeTemplate = runtimeTemplate;
		/** @type {string} */
		this.type = "javascript";
		this.hooks = Object.freeze({
			content: {
				tap: util.deprecate(
					/**
					 * Handles the callback logic for this hook.
					 * @template AdditionalOptions
					 * @param {string | Tap & IfSet<AdditionalOptions>} options options
					 * @param {(source: Source, module: Module, moduleRenderContext: ModuleRenderContext, dependencyTemplates: DependencyTemplates) => Source} fn fn
					 */
					(options, fn) => {
						getJavascriptModulesPlugin()
							.getCompilationHooks(compilation)
							.renderModuleContent.tap(
								options,
								(source, module, renderContext) =>
									fn(
										source,
										module,
										renderContext,
										renderContext.dependencyTemplates
									)
							);
					},
					"ModuleTemplate.hooks.content is deprecated (use JavascriptModulesPlugin.getCompilationHooks().renderModuleContent instead)",
					"DEP_MODULE_TEMPLATE_CONTENT"
				)
			},
			module: {
				tap: util.deprecate(
					/**
					 * Handles the callback logic for this hook.
					 * @template AdditionalOptions
					 * @param {string | Tap & IfSet<AdditionalOptions>} options options
					 * @param {(source: Source, module: Module, moduleRenderContext: ModuleRenderContext, dependencyTemplates: DependencyTemplates) => Source} fn fn
					 */
					(options, fn) => {
						getJavascriptModulesPlugin()
							.getCompilationHooks(compilation)
							.renderModuleContent.tap(
								options,
								(source, module, renderContext) =>
									fn(
										source,
										module,
										renderContext,
										renderContext.dependencyTemplates
									)
							);
					},
					"ModuleTemplate.hooks.module is deprecated (use JavascriptModulesPlugin.getCompilationHooks().renderModuleContent instead)",
					"DEP_MODULE_TEMPLATE_MODULE"
				)
			},
			render: {
				tap: util.deprecate(
					/**
					 * Handles the callback logic for this hook.
					 * @template AdditionalOptions
					 * @param {string | Tap & IfSet<AdditionalOptions>} options options
					 * @param {(source: Source, module: Module, chunkRenderContext: ChunkRenderContext, dependencyTemplates: DependencyTemplates) => Source} fn fn
					 */
					(options, fn) => {
						getJavascriptModulesPlugin()
							.getCompilationHooks(compilation)
							.renderModuleContainer.tap(
								options,
								(source, module, renderContext) =>
									fn(
										source,
										module,
										renderContext,
										renderContext.dependencyTemplates
									)
							);
					},
					"ModuleTemplate.hooks.render is deprecated (use JavascriptModulesPlugin.getCompilationHooks().renderModuleContainer instead)",
					"DEP_MODULE_TEMPLATE_RENDER"
				)
			},
			package: {
				tap: util.deprecate(
					/**
					 * Handles the callback logic for this hook.
					 * @template AdditionalOptions
					 * @param {string | Tap & IfSet<AdditionalOptions>} options options
					 * @param {(source: Source, module: Module, chunkRenderContext: ChunkRenderContext, dependencyTemplates: DependencyTemplates) => Source} fn fn
					 */
					(options, fn) => {
						getJavascriptModulesPlugin()
							.getCompilationHooks(compilation)
							.renderModulePackage.tap(
								options,
								(source, module, renderContext) =>
									fn(
										source,
										module,
										renderContext,
										renderContext.dependencyTemplates
									)
							);
					},
					"ModuleTemplate.hooks.package is deprecated (use JavascriptModulesPlugin.getCompilationHooks().renderModulePackage instead)",
					"DEP_MODULE_TEMPLATE_PACKAGE"
				)
			},
			hash: {
				tap: util.deprecate(
					/**
					 * Handles the callback logic for this hook.
					 * @template AdditionalOptions
					 * @param {string | Tap & IfSet<AdditionalOptions>} options options
					 * @param {(hash: Hash) => void} fn fn
					 */
					(options, fn) => {
						compilation.hooks.fullHash.tap(options, fn);
					},
					"ModuleTemplate.hooks.hash is deprecated (use Compilation.hooks.fullHash instead)",
					"DEP_MODULE_TEMPLATE_HASH"
				)
			}
		});
	}
}

Object.defineProperty(ModuleTemplate.prototype, "runtimeTemplate", {
	get: util.deprecate(
		/**
		 * Returns output options.
		 * @this {ModuleTemplate}
		 * @returns {RuntimeTemplate} output options
		 */
		function runtimeTemplate() {
			return this._runtimeTemplate;
		},
		"ModuleTemplate.runtimeTemplate is deprecated (use Compilation.runtimeTemplate instead)",
		"DEP_WEBPACK_CHUNK_TEMPLATE_OUTPUT_OPTIONS"
	)
});

export default ModuleTemplate;

export { ModuleTemplate as "module.exports" };
