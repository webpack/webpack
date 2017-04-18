/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

function hasModule(chunk, module, checkedChunks) {
	if(module.isInChunk(chunk)) return [chunk];
	if(chunk.parents.length === 0) return false;
	return allHaveModule(chunk.parents.filter((c) => {
		return checkedChunks.indexOf(c) < 0;
	}), module, checkedChunks);
}

function allHaveModule(someChunks, module, checkedChunks) {
	if(!checkedChunks) checkedChunks = [];
	var chunks = [];
	for(var i = 0; i < someChunks.length; i++) {
		checkedChunks.push(someChunks[i]);
		var subChunks = hasModule(someChunks[i], module, checkedChunks);
		if(!subChunks) return false;

		for(var index = 0; index < subChunks.length; index++) {
			var item = subChunks[index];

			if(!chunks.length || chunks.indexOf(item) < 0) {
				chunks.push(item);
			}
		}
	}
	return chunks;
}


class RemoveParentModulesPlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin(["optimize-chunks-basic", "optimize-extracted-chunks-basic"], (chunks) => {
				for(var index = 0; index < chunks.length; index++) {
					var chunk = chunks[index];
					if(chunk.parents.length === 0) continue;

					// TODO consider Map when performance has improved https://gist.github.com/sokra/b36098368da7b8f6792fd7c85fca6311
					var cache = Object.create(null);
					var modules = chunk.modules.slice();
					for(var i = 0; i < modules.length; i++) {
						var module = modules[i];

						var dId = module.getChunkIdsIdent();
						var parentChunksWithModule;
						if(dId !== null && (dId in cache)) {
							parentChunksWithModule = cache[dId];
						} else {
							parentChunksWithModule = cache[dId] = allHaveModule(chunk.parents, module);
						}
						if(parentChunksWithModule) {
							module.rewriteChunkInReasons(chunk, parentChunksWithModule);
							chunk.removeModule(module);
						}
					}
				}
			});
		});
	}
}
module.exports = RemoveParentModulesPlugin;
