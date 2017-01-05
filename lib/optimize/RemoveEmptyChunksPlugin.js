/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class RemoveEmptyChunksPlugin {

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin(["optimize-chunks-basic", "optimize-extracted-chunks-basic"], (chunks) => {
				chunks.filter((chunk) => chunk.isEmpty() && !chunk.hasRuntime() && !chunk.hasEntryModule())
					.forEach((chunk) => {
						chunk.remove("empty");
						chunks.splice(chunks.indexOf(chunk), 1);
					});
			});
		});
	}
}
module.exports = RemoveEmptyChunksPlugin;
