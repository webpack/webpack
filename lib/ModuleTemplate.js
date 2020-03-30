/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const memorize = require("./util/memorize");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./util/Hash")} Hash */

const getJavascriptModulesPlugin = memorize(() =>
	require("./javascript/JavascriptModulesPlugin")
);

/**
 * @typedef {Object} RenderContext
 * @property {Chunk} chunk the chunk
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 */

// TODO webpack 6: remove this class
class ModuleTemplate {
	/**
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {Compilation} compilation the compilation
	 */
	constructor(runtimeTemplate, compilation) {
		this._runtimeTemplate = runtimeTemplate;
		this.type = "javascript";
		this.hooks = Object.freeze({
			content: {
				tap: util.deprecate(
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
					(options, fn) => {
						compilation.hooks.fullHash.tap(options, fn);
					},
					"ModuleTemplate.hooks.package is deprecated (use Compilation.hooks.fullHash instead)",
					"DEP_MODULE_TEMPLATE_HASH"
				)
			}
		});
	}
}

Object.defineProperty(ModuleTemplate.prototype, "runtimeTemplate", {
	get: util.deprecate(
		/**
		 * @this {ModuleTemplate}
		 * @returns {TODO} output options
		 */
		function () {
			return this._runtimeTemplate;
		},
		"ModuleTemplate.runtimeTemplate is deprecated (use Compilation.runtimeTemplate instead)",
		"DEP_WEBPACK_CHUNK_TEMPLATE_OUTPUT_OPTIONS"
	)
});

module.exports = ModuleTemplate;
