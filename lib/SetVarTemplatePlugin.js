/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const RuntimeGlobals = require("./RuntimeGlobals");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");

/** @typedef {import("./Compiler")} Compiler */

class SetVarTemplatePlugin {
	/**
	 * @param {string} varExpression the accessor where the library is exported
	 * @param {boolean} copyObject specify copying the exports
	 */
	constructor(varExpression, copyObject) {
		/** @type {string} */
		this.varExpression = varExpression;
		/** @type {boolean} */
		this.copyObject = copyObject;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("SetVarTemplatePlugin", compilation => {
			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				"LibraryTemplatePlugin",
				(chunk, set) => {
					set.add(RuntimeGlobals.returnExportsFromRuntime);
				}
			);

			const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);

			hooks.render.tap(
				"SetVarTemplatePlugin",
				(source, { chunk, chunkGraph }) => {
					if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return source;
					const varExpression = compilation.getPath(this.varExpression, {
						chunk
					});
					if (this.copyObject) {
						return new ConcatSource(
							`(function(e, a) { for(var i in a) e[i] = a[i]; }(${varExpression}, `,
							source,
							"))"
						);
					} else {
						const prefix = `${varExpression} =\n`;
						return new ConcatSource(prefix, source);
					}
				}
			);

			hooks.chunkHash.tap(
				"SetVarTemplatePlugin",
				(chunk, hash, { chunkGraph }) => {
					if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return;
					hash.update("set var");
					const varExpression = compilation.getPath(this.varExpression, {
						chunk
					});
					hash.update(`${varExpression}`);
					hash.update(`${this.copyObject}`);
				}
			);
		});
	}
}

module.exports = SetVarTemplatePlugin;
