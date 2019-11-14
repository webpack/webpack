/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const { UsageState } = require("./ModuleGraph");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");

/** @typedef {import("./Compiler")} Compiler */

/**
 * @param {string[]} accessor the accessor to convert to path
 * @returns {string} the path
 */
const accessorToObjectAccess = accessor => {
	return accessor.map(a => `[${JSON.stringify(a)}]`).join("");
};

class ExportPropertyTemplatePlugin {
	/**
	 * @param {string|string[]} property the name of the property to export
	 * @param {string} explanation an explanation why this property is used
	 */
	constructor(property, explanation) {
		this.property = property;
		this.explanation = explanation;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"ExportPropertyTemplatePlugin",
			compilation => {
				const moduleGraph = compilation.moduleGraph;
				compilation.hooks.seal.tap("ExportPropertyTemplatePlugin", () => {
					for (const deps of compilation.entryDependencies.values()) {
						const dep = deps[deps.length - 1];
						if (dep) {
							const module = moduleGraph.getModule(dep);
							if (module) {
								const exportsInfo = moduleGraph.getExportInfo(
									module,
									Array.isArray(this.property)
										? this.property[0]
										: this.property
								);
								exportsInfo.used = UsageState.Used;
								exportsInfo.canMangleUse = false;
								moduleGraph.addExtraReason(module, this.explanation);
							}
						}
					}
				});

				const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);

				hooks.render.tap(
					"ExportPropertyTemplatePlugin",
					(source, { chunk, chunkGraph }) => {
						if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return source;
						const postfix = accessorToObjectAccess([].concat(this.property));
						return new ConcatSource(source, postfix);
					}
				);

				hooks.chunkHash.tap(
					"ExportPropertyTemplatePlugin",
					(chunk, hash, { chunkGraph }) => {
						if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return;
						hash.update("export property");
						hash.update(`${this.property}`);
					}
				);
			}
		);
	}
}

module.exports = ExportPropertyTemplatePlugin;
