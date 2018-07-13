/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("./Compiler")} Compiler */

class LoaderTargetPlugin {
	constructor(target) {
		this.target = target;
	}

	/**
	 * @param {Compiler} compiler Webpack Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("LoaderTargetPlugin", compilation => {
			compilation.hooks.normalModuleLoader.tap(
				"LoaderTargetPlugin",
				loaderContext => {
					loaderContext.target = this.target;
				}
			);
		});
	}
}

module.exports = LoaderTargetPlugin;
