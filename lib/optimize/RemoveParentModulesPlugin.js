/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function hasModule(chunk, module, checkedChunks) {
	if(chunk.modules.indexOf(module) >= 0) return [chunk];
	if(chunk.entry) return false;
	return allHaveModule(chunk.parents.filter(function(c) {
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
		addToSet(chunks, subChunks);
	}
	return chunks;
}

function addToSet(set, items) {
	items.forEach(function(item) {
		if(set.indexOf(item) < 0)
			set.push(item);
	});
}

function RemoveParentModulesPlugin() {}
module.exports = RemoveParentModulesPlugin;

RemoveParentModulesPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin(["optimize-chunks", "optimize-extracted-chunks"], function(chunks) {
			chunks.forEach(function(chunk) {
				chunk.modules.slice().forEach(function(module) {
					if(chunk.entry) return;
					var parentChunksWithModule = allHaveModule(chunk.parents, module);
					if(parentChunksWithModule) {
						module.rewriteChunkInReasons(chunk, parentChunksWithModule);
						chunk.removeModule(module);
					}
				});
			});
		});
	});
};
