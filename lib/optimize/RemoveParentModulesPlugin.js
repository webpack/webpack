/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Queue = require("../util/Queue");

const getParentChunksWithModule = (currentChunk, module) => {
	const chunks = [];
	const stack = new Set(currentChunk.parentsIterable);

	for(const chunk of stack) {
		if(chunk.containsModule(module)) {
			chunks.push(chunk);
		} else {
			for(const parent of chunk.parentsIterable) {
				stack.add(parent);
			}
		}
	}

	return chunks;
};

class RemoveParentModulesPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("RemoveParentModulesPlugin", (compilation) => {
			const handler = (chunks) => {
				const queue = new Queue(chunks);
				const availableModulesMap = new Map();

				for(const chunk of chunks) {
					// initialize available modules for chunks without parents
					if(chunk.getNumberOfParents() === 0)
						availableModulesMap.set(chunk, new Set());
				}

				while(queue.length > 0) {
					const chunk = queue.dequeue();
					let availableModules = availableModulesMap.get(chunk);
					let changed = false;
					for(const parent of chunk.parentsIterable) {
						const availableModulesInParent = availableModulesMap.get(parent);
						if(availableModulesInParent !== undefined) {
							// If we know the available modules in parent: process these
							if(availableModules === undefined) {
								// if we have not own info yet: create new entry
								availableModules = new Set(availableModulesInParent);
								for(const m of parent.modulesIterable)
									availableModules.add(m);
								availableModulesMap.set(chunk, availableModules);
								changed = true;
							} else {
								for(const m of availableModules) {
									if(!parent.containsModule(m) && !availableModulesInParent.has(m)) {
										availableModules.delete(m);
										changed = true;
									}
								}
							}
						}
					}
					if(changed) {
						// if something changed: enqueue our children
						for(const child of chunk.chunksIterable)
							queue.enqueue(child);
					}
				}

				// now we have available modules for every chunk

				for(const chunk of chunks) {
					// remove modules from chunk if they are already available
					const availableModules = availableModulesMap.get(chunk);
					const modules = new Set(chunk.modulesIterable);
					const toRemove = new Set();
					if(modules.size < availableModules.size) {
						for(const m of modules)
							if(availableModules.has(m))
								toRemove.add(m);
					} else {
						for(const m of availableModules)
							if(modules.has(m))
								toRemove.add(m);
					}
					for(const module of toRemove) {
						module.rewriteChunkInReasons(chunk, getParentChunksWithModule(chunk, module));
						chunk.removeModule(module);
					}
				}
			};
			compilation.hooks.optimizeChunksBasic.tap("RemoveParentModulesPlugin", handler);
			compilation.hooks.optimizeExtractedChunksBasic.tap("RemoveParentModulesPlugin", handler);
		});
	}
}
module.exports = RemoveParentModulesPlugin;
