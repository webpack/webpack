/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

function hasModule(chunk, module, checkedChunks) {
	if(chunk.containsModule(module)) return [chunk];
	if(chunk.parents.length === 0) return false;
	return allHaveModule(chunk.parents.filter((c) => {
		return !checkedChunks.has(c);
	}), module, checkedChunks);
}

function allHaveModule(someChunks, module, checkedChunks) {
	if(!checkedChunks) checkedChunks = new Set();
	var chunks = new Set();
	for(var i = 0; i < someChunks.length; i++) {
		checkedChunks.add(someChunks[i]);
		var subChunks = hasModule(someChunks[i], module, checkedChunks);
		if(!subChunks) return false;

		for(var index = 0; index < subChunks.length; index++) {
			var item = subChunks[index];

			chunks.add(item);
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

					var modules = chunk.getModules();
					for(var i = 0; i < modules.length; i++) {
						var module = modules[i];

						var parentChunksWithModule = allHaveModule(chunk.parents, module);
						if(parentChunksWithModule) {
							chunk.removeModule(module);
						}
					}
				}
			});
		});
	}
}
module.exports = RemoveParentModulesPlugin;
