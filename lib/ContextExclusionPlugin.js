"use strict";

class ContextExclusionPlugin {
	constructor(negativeMatcher) {
		this.negativeMatcher = negativeMatcher;
	}

	apply(compiler) {
		compiler.hooks.contextModuleFactory.tap("ContextExclusionPlugin", (cmf) => {
			cmf.plugin("context-module-files", (files) => {
				return files.filter(filePath => !this.negativeMatcher.test(filePath));
			});
		});
	}
}

module.exports = ContextExclusionPlugin;
