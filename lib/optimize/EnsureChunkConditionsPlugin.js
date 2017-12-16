/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class EnsureChunkConditionsPlugin {

	apply(compiler) {
		compiler.hooks.compilation.tap("EnsureChunkConditionsPlugin", (compilation) => {
			const triesMap = new Map();
			compilation.plugin(["optimize-chunks-basic", "optimize-extracted-chunks-basic"], (chunks) => {
				let changed = false;
				chunks.forEach((chunk) => {
					chunk.forEachModule((module) => {
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
					});
				});
				if(changed) return true;
			});
		});
	}
}
module.exports = EnsureChunkConditionsPlugin;
