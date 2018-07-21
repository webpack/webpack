/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class FlagInitialModulesAsUsedPlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("after-optimize-chunks", (chunks) => {
				chunks.forEach((chunk) => {
					if(!chunk.isInitial()) {
						return;
					}
					chunk.forEachModule((module) => {
						module.usedExports = true;
					});
				});
			});
		});
	}
}

module.exports = FlagInitialModulesAsUsedPlugin;
