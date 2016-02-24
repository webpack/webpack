/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function listToSet(list, chunk) {
	var set = {};
	list.forEach(function(module) {
		set[module._RemoveParentModulesPlugin_index] = {
			module: module,
			chunks: [chunk]
		};
	});
	return set;
}

function mergeSets(a, b) {
	var newSet = {};
	Object.keys(a).forEach(function(key) {
		var item = a[key];
		newSet[key] = {
			module: item.module,
			chunks: item.chunks
		};
	});
	Object.keys(b).forEach(function(key) {
		var item = b[key];
		newSet[key] = {
			module: item.module,
			chunks: item.chunks
		};
	});
	return newSet;
}

function intersectSets(a, b) {
	var newSet = {};
	Object.keys(a).forEach(function(key) {
		var aItem = a[key];
		var bItem = b[key];
		if(bItem) {
			newSet[key] = {
				module: aItem.module,
				chunks: aItem.chunks.concat(bItem.chunks)
			};
		}
	});
	return newSet;
}

function intersectAll(map) {
	var keys = Object.keys(map);
	if(keys.length === 0)
		return null;
	return keys.map(function(key) {
		return map[key];
	}).reduce(intersectSets);
}

function addToSet(set, items) {
	items.forEach(function(item) {
		if(set.indexOf(item) < 0)
			set.push(item);
	});
}

function toStr(set) {
	return Object.keys(set).map(function(key) {
		return set[key].module.request.substr(-12);
	}).join(", ");
}

function RemoveParentModulesPlugin() {}
module.exports = RemoveParentModulesPlugin;

RemoveParentModulesPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin(["optimize-chunks-basic", "optimize-extracted-chunks-basic"], function(chunks) {
			this.modules.forEach(function(module, idx) {
				module._RemoveParentModulesPlugin_index = idx;
			})
			var todo = chunks.slice();
			todo.forEach(function(chunk, idx) {
				chunk._RemoveParentModulesPlugin_processed = false;
				chunk._RemoveParentModulesPlugin_availableModulesByChunk = {};
				chunk._RemoveParentModulesPlugin_index = idx;
			})
			for(var i = 0; i < todo.length; i++) {
				var chunk = todo[i];
				var index = chunk._RemoveParentModulesPlugin_index;
				var availableModules = chunk._RemoveParentModulesPlugin_availableModules = intersectAll(chunk._RemoveParentModulesPlugin_availableModulesByChunk);
				if(chunk.chunks.length === 0) {
					chunk._RemoveParentModulesPlugin_processed = true;
					continue;
				}
				var set = listToSet(chunk.modules, chunk);
				if(availableModules)
					set = mergeSets(set, availableModules);
				chunk.chunks.forEach(function(child) {
					var availableModules = child._RemoveParentModulesPlugin_availableModulesByChunk[index];
					child._RemoveParentModulesPlugin_availableModulesByChunk[index] = set;
					if(!availableModules || Object.keys(availableModules).length !== Object.keys(set).length) {
						if(child._RemoveParentModulesPlugin_processed) {
							todo.push(child);
							child._RemoveParentModulesPlugin_processed = false;
						}
					}
				});
				chunk._RemoveParentModulesPlugin_processed = true;
			}
			chunks.forEach(function(chunk) {
				var availableModules = chunk._RemoveParentModulesPlugin_availableModules;
				delete chunk._RemoveParentModulesPlugin_availableModulesByChunk;
				delete chunk._RemoveParentModulesPlugin_availableModules;
				delete chunk._RemoveParentModulesPlugin_processed;
				delete chunk._RemoveParentModulesPlugin_index;
				if(chunk.entry) return;
				if(!availableModules) return;
				chunk.modules.slice().forEach(function(module) {
					var info = availableModules[module._RemoveParentModulesPlugin_index];
					if(!info) return;
					var parentChunksWithModule = info.chunks;
					parentChunksWithModule = parentChunksWithModule.filter(function(chunk, idx) {
						return parentChunksWithModule.indexOf(chunk) === idx;
					});
					if(parentChunksWithModule) {
						module.rewriteChunkInReasons(chunk, parentChunksWithModule);
						chunk.removeModule(module);
					}
				});
			});
		});
	});
};
