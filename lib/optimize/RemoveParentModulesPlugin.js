/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function chunkContainsModule(chunk, module) {
	var chunks = module.chunks;
	var modules = chunk.modules;
	if(chunks.length < modules.length) {
		return chunks.indexOf(chunk) >= 0;
	} else {
		return modules.indexOf(module) >= 0;
	}
}

function hasModule(chunk, module, checkedChunks) {
	if(chunkContainsModule(chunk, module)) return [chunk];
	if(chunk.parents.length === 0) return false;
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

function debugIds(chunks) {
	var list = chunks.map(function(chunk) {
		return chunk.debugId;
	});
	var debugIdMissing = list.some(function(dId) {
		return typeof dId !== "number";
	});
	if(debugIdMissing)
		return "no";
	list.sort();
	return list.join(",");
}

function RemoveParentModulesPlugin() {}
module.exports = RemoveParentModulesPlugin;

RemoveParentModulesPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin(["optimize-chunks-basic", "optimize-extracted-chunks-basic"], function(chunks) {
			chunks.forEach(function(chunk) {
				var cache = {};
				chunk.modules.slice().forEach(function(module) {
					if(chunk.parents.length === 0) return;
					var dId = "$" + debugIds(module.chunks);
					var parentChunksWithModule;
					if((dId in cache) && dId !== "$no") {
						parentChunksWithModule = cache[dId];
					} else {
						parentChunksWithModule = cache[dId] = allHaveModule(chunk.parents, module);
					}
					if(parentChunksWithModule) {
						module.rewriteChunkInReasons(chunk, parentChunksWithModule);
						chunk.removeModule(module);
					}
				});
			});
		});
	});
};
