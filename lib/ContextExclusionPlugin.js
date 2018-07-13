"use strict";

/** @typedef {import("./Compiler")} Compiler */

class ContextExclusionPlugin {
	constructor(negativeMatcher) {
		this.negativeMatcher = negativeMatcher;
	}

	/**
	 * @param {Compiler} compiler Webpack Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.contextModuleFactory.tap("ContextExclusionPlugin", cmf => {
			cmf.hooks.contextModuleFiles.tap("ContextExclusionPlugin", files => {
				return files.filter(filePath => !this.negativeMatcher.test(filePath));
			});
		});
	}
}

module.exports = ContextExclusionPlugin;
