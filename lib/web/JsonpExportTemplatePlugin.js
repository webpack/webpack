/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const JavascriptModulesPlugin = require("../JavascriptModulesPlugin");
const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("../Compiler")} Compiler */

class JsonpExportTemplatePlugin {
	/**
	 * @param {string} name jsonp function name
	 */
	constructor(name) {
		this.name = name;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"JsonpExportTemplatePlugin",
			compilation => {
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"JsonpExportTemplatePlugin",
					(chunk, set) => {
						set.add(RuntimeGlobals.returnExportsFromRuntime);
					}
				);

				const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);

				hooks.renderWithEntry.tap(
					"JsonpExportTemplatePlugin",
					(source, { chunk }) => {
						const name = compilation.getPath(this.name || "", {
							chunk
						});
						return new ConcatSource(`${name}(`, source, ");");
					}
				);

				hooks.chunkHash.tap("JsonpExportTemplatePlugin", (chunk, hash) => {
					hash.update("jsonp export");
					const name = compilation.getPath(this.name || "", {
						chunk
					});
					hash.update(`${name}`);
				});
			}
		);
	}
}

module.exports = JsonpExportTemplatePlugin;
