/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const JavascriptModulesPlugin = require("./JavascriptModulesPlugin");

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
	 */
	constructor(property) {
		this.property = property;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"ExportPropertyTemplatePlugin",
			compilation => {
				const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);

				hooks.renderWithEntry.tap(
					"ExportPropertyTemplatePlugin",
					(source, { chunk }) => {
						const postfix = accessorToObjectAccess([].concat(this.property));
						return new ConcatSource(source, postfix);
					}
				);

				hooks.chunkHash.tap("ExportPropertyTemplatePlugin", (chunk, hash) => {
					if (!chunk.hasEntryModule()) return;
					hash.update("export property");
					hash.update(`${this.property}`);
				});
			}
		);
	}
}

module.exports = ExportPropertyTemplatePlugin;
