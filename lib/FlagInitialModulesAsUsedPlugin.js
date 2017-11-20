/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class FlagInitialModulesAsUsedPlugin {
	constructor(explaination) {
		this.explaination = explaination;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("after-optimize-chunks", (chunks) => {
				chunks.forEach((chunk) => {
					if(!chunk.isInitial()) {
						return;
					}
					chunk.forEachModule((module) => {
						module.used = true;
						module.usedExports = true;
						module.addReason(null, null, this.explaination);
					});
				});
			});
		});
	}
}

module.exports = FlagInitialModulesAsUsedPlugin;
