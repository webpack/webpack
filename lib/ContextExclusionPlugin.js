"use strict";

class ContextExclusionPlugin {
	constructor(negativeMatcher) {
		this.negativeMatcher = negativeMatcher;
	}

	apply(compiler) {
		compiler.hooks.contextModuleFactory.tap("ContextExclusionPlugin", cmf => {
			cmf.hooks.contextModuleFiles.tap("ContextExclusionPlugin", files => {
				return files.filter(filePath => !this.negativeMatcher.test(filePath));
			});
		});
	}
}

module.exports = ContextExclusionPlugin;
