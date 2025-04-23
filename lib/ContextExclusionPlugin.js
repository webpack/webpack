/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./ContextModuleFactory")} ContextModuleFactory */

const PLUGIN_NAME = "ContextExclusionPlugin";

class ContextExclusionPlugin {
	/**
	 * @param {RegExp} negativeMatcher Matcher regular expression
	 */
	constructor(negativeMatcher) {
		this.negativeMatcher = negativeMatcher;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.contextModuleFactory.tap(PLUGIN_NAME, cmf => {
			cmf.hooks.contextModuleFiles.tap(PLUGIN_NAME, files =>
				files.filter(filePath => !this.negativeMatcher.test(filePath))
			);
		});
	}
}

module.exports = ContextExclusionPlugin;
