/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, RawSource } = require("webpack-sources");
const ExternalModule = require("./ExternalModule");
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Compiler")} Compiler */

/** @type {WeakMap<Source, Source>} */
const cache = new WeakMap();

const devtoolWarning = new RawSource(`/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
`);

class EvalDevToolModulePlugin {
	constructor(options) {
		this.namespace = options.namespace || "";
		this.sourceUrlComment = options.sourceUrlComment || "\n//# sourceURL=[url]";
		this.moduleFilenameTemplate =
			options.moduleFilenameTemplate ||
			"webpack://[namespace]/[resourcePath]?[loaders]";
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("EvalDevToolModulePlugin", compilation => {
			const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
			hooks.renderModuleContent.tap(
				"EvalDevToolModulePlugin",
				(source, module, { runtimeTemplate, chunkGraph }) => {
					const cacheEntry = cache.get(source);
					if (cacheEntry !== undefined) return cacheEntry;
					if (module instanceof ExternalModule) {
						cache.set(source, source);
						return source;
					}
					const content = source.source();
					const str = ModuleFilenameHelpers.createFilename(
						module,
						{
							moduleFilenameTemplate: this.moduleFilenameTemplate,
							namespace: this.namespace
						},
						{
							requestShortener: runtimeTemplate.requestShortener,
							chunkGraph
						}
					);
					const footer =
						"\n" +
						this.sourceUrlComment.replace(
							/\[url\]/g,
							encodeURI(str)
								.replace(/%2F/g, "/")
								.replace(/%20/g, "_")
								.replace(/%5E/g, "^")
								.replace(/%5C/g, "\\")
								.replace(/^\//, "")
						);
					const result = new RawSource(
						`eval(${JSON.stringify(content + footer)});`
					);
					cache.set(source, result);
					return result;
				}
			);
			hooks.inlineInRuntimeBailout.tap(
				"EvalDevToolModulePlugin",
				() => "the eval devtool is used."
			);
			hooks.render.tap(
				"EvalDevToolModulePlugin",
				source => new ConcatSource(devtoolWarning, source)
			);
			hooks.chunkHash.tap("EvalDevToolModulePlugin", (chunk, hash) => {
				hash.update("EvalDevToolModulePlugin");
				hash.update("2");
			});
		});
	}
}

module.exports = EvalDevToolModulePlugin;
