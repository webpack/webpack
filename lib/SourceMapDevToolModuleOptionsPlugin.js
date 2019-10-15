/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Compilation")} Compilation */

class SourceMapDevToolModuleOptionsPlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {Compilation} compilation the compiler instance
	 * @returns {void}
	 */
	apply(compilation) {
		const options = this.options;
		if (options.module !== false) {
			compilation.hooks.buildModule.tap(
				"SourceMapDevToolModuleOptionsPlugin",
				module => {
					module.useSourceMap = true;
				}
			);
		}
	}
}

module.exports = SourceMapDevToolModuleOptionsPlugin;
