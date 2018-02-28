/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class RemoveEmptyChunksPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("RemoveEmptyChunksPlugin", compilation => {
			const handler = chunks => {
				chunks
					.filter(
						chunk =>
							chunk.isEmpty() && !chunk.hasRuntime() && !chunk.hasEntryModule()
					)
					.forEach(chunk => {
						chunk.remove("empty");
						chunks.splice(chunks.indexOf(chunk), 1);
					});
			};
			compilation.hooks.optimizeChunksBasic.tap(
				"RemoveEmptyChunksPlugin",
				handler
			);
			compilation.hooks.optimizeExtractedChunksBasic.tap(
				"RemoveEmptyChunksPlugin",
				handler
			);
		});
	}
}
module.exports = RemoveEmptyChunksPlugin;
