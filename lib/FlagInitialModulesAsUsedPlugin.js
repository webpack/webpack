/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
"use strict";
class FlagInitialModulesAsUsedPlugin {
	apply(compiler) {
		compiler.plugin("compilation", function(compilation) {
			compilation.plugin("after-optimize-chunks", function(chunks) {
				chunks.forEach(chunk => {
					if(!chunk.isInitial()) {
						return;
					}
					chunk.modules.forEach(module => {
						module.usedExports = true;
					});
				});
			});
		});
	}
}
module.exports = FlagInitialModulesAsUsedPlugin;
