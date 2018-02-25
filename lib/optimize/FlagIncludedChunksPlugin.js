/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class FlagIncludedChunksPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("FlagIncludedChunksPlugin", compilation => {
			compilation.hooks.optimizeChunkIds.tap(
				"FlagIncludedChunksPlugin",
				chunks => {
					for (const chunkA of chunks) {
						loopB: for (const chunkB of chunks) {
							// as we iterate the same iterables twice
							// skip if we find ourselves
							if (chunkA === chunkB) continue loopB;

							// instead of swapping A and B just bail
							// as we loop twice the current A will be B and B then A
							if (chunkA.getNumberOfModules() < chunkB.getNumberOfModules())
								continue loopB;

							if (chunkB.getNumberOfModules() === 0) continue loopB;

							// is chunkB in chunkA?
							for (const m of chunkB.modulesIterable) {
								if (!chunkA.containsModule(m)) continue loopB;
							}
							chunkA.ids.push(chunkB.id);
						}
					}
				}
			);
		});
	}
}
module.exports = FlagIncludedChunksPlugin;
