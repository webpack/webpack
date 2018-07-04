"use strict";

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./ContextModuleFactory")} ContextModuleFactory */

class ContextExclusionPlugin {
	/**
	 * @param {RegExp} negativeMatcher Matcher regular expression
	 */
	constructor(negativeMatcher) {
		this.negativeMatcher = negativeMatcher;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler Webpack Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.contextModuleFactory.tap("ContextExclusionPlugin", (
			/** @type {ContextModuleFactory} */ cmf
		) => {
			cmf.hooks.contextModuleFiles.tap("ContextExclusionPlugin", (
				/** @type {TODO} */ files
			) => {
				return files.filter(filePath => !this.negativeMatcher.test(filePath));
			});
		});
	}
}

module.exports = ContextExclusionPlugin;
