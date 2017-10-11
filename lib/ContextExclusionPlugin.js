"use strict";

class ContextExclusionPlugin {
	constructor(negativeMatcher) {
		this.negativeMatcher = negativeMatcher;
	}

	apply(compiler) {
		compiler.plugin("context-module-factory", (cmf) => {
			cmf.plugin("context-module-files", (files) => {
				return files.filter(filePath => !this.negativeMatcher.test(filePath));
			});
		});
	}
}

module.exports = ContextExclusionPlugin;
