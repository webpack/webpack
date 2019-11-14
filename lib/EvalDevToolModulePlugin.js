/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Compiler")} Compiler */

/** @type {WeakMap<Source, Source>} */
const cache = new WeakMap();

class EvalDevToolModulePlugin {
	constructor(options) {
		this.namespace = options.namespace || "";
		this.sourceUrlComment = options.sourceUrlComment || "\n//# sourceURL=[url]";
		this.moduleFilenameTemplate =
			options.moduleFilenameTemplate ||
			"webpack://[namespace]/[resourcePath]?[loaders]";
	}

	/**
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
			hooks.chunkHash.tap("EvalDevToolModulePlugin", (chunk, hash) => {
				hash.update("EvalDevToolModulePlugin");
				hash.update("1");
			});
		});
	}
}

module.exports = EvalDevToolModulePlugin;
