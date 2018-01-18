/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class EnsureChunkConditionsPlugin {

	apply(compiler) {
		compiler.hooks.compilation.tap("EnsureChunkConditionsPlugin", (compilation) => {
			const triesMap = new Map();
			const handler = (chunks) => {
				let changed = false;
				chunks.forEach((chunk) => {
					for(const module of chunk.modulesIterable) {
						if(!module.chunkCondition) return;
						if(!module.chunkCondition(chunk)) {
							let usedChunks = triesMap.get(module);
							if(!usedChunks) triesMap.set(module, usedChunks = new Set());
							usedChunks.add(chunk);
							const newChunks = [];
							for(const parent of chunk.parentsIterable) {
								if(!usedChunks.has(parent)) {
									parent.addModule(module);
									module.addChunk(parent);
									newChunks.push(parent);
								}
							}
							module.rewriteChunkInReasons(chunk, newChunks);
							chunk.removeModule(module);
							changed = true;
						}
					}
				});
				if(changed) return true;
			};
			compilation.hooks.optimizeChunksBasic.tap("EnsureChunkConditionsPlugin", handler);
			compilation.hooks.optimizeExtractedChunksBasic.tap("EnsureChunkConditionsPlugin", handler);
		});
	}
}
module.exports = EnsureChunkConditionsPlugin;
