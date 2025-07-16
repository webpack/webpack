/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NormalModule = require("./NormalModule");

/** @typedef {import("./Compiler")} Compiler */

const PLUGIN_NAME = "LoaderTargetPlugin";

class LoaderTargetPlugin {
	/**
	 * @param {string} target the target
	 */
	constructor(target) {
		this.target = target;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			NormalModule.getCompilationHooks(compilation).loader.tap(
				PLUGIN_NAME,
				(loaderContext) => {
					loaderContext.target = this.target;
				}
			);
		});
	}
}

module.exports = LoaderTargetPlugin;
