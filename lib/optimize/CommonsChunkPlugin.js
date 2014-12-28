/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function CommonsChunkPlugin(chunkNames, filenameTemplate, selectedChunks, minCount) {
	if(typeof filenameTemplate !== "string" && filenameTemplate !== null) {
		minCount = selectedChunks;
		selectedChunks = filenameTemplate
		filenameTemplate = chunkNames;
	}
	if(!Array.isArray(selectedChunks) && typeof selectedChunks !== "boolean") {
		minCount = selectedChunks;
		selectedChunks = undefined;
	}
	this.chunkNames = chunkNames;
	this.filenameTemplate = filenameTemplate;
	this.minCount = minCount;
	this.selectedChunks = selectedChunks;
}
module.exports = CommonsChunkPlugin;
CommonsChunkPlugin.prototype.apply = function(compiler) {
	var chunkNames = this.chunkNames;
	var filenameTemplate = this.filenameTemplate;
	var minCount = this.minCount;
	var selectedChunks = this.selectedChunks;
	compiler.plugin("this-compilation", function(compilation) {
		compilation.plugin(["optimize-chunks", "optimize-extracted-chunks"], function(chunks) {
			if(!chunkNames && selectedChunks === false) {
				var commonChunks = chunks;
			} else if(Array.isArray(chunkNames)) {
				var commonChunks = chunks.filter(function(chunk) {
					return chunkNames.indexOf(chunk.name) >= 0;
				});
			} else {
				var commonChunks = chunks.filter(function(chunk) {
					return chunk.name === chunkNames;
				});
			}
			if(commonChunks.length === 0) {
				var chunk = this.addChunk(chunkNames);
				chunk.initial = chunk.entry = true;
				commonChunks = [chunk];
			}
			commonChunks.forEach(function processCommonChunk(commonChunk) {
				var commonModulesCount = [];
				var commonModules = [];
				if(Array.isArray(selectedChunks)) {
					var usedChunks = chunks.filter(function(chunk) {
						if(chunk === commonChunk) return false;
						return selectedChunks.indexOf(chunk.name) >= 0;
					});
				} else if(selectedChunks === false || !commonChunk.entry) {
					var usedChunks = (commonChunk.chunks || []).filter(function(chunk) {
						// we can only move modules from this chunk if the "commonChunk" is the only parent
						return chunk.parents.length === 1;
					});
				} else {
					var usedChunks = chunks.filter(function(chunk) {
						if(chunk === commonChunk) return false;
						return chunk.entry;
					});
				}
				usedChunks.forEach(function(chunk) {
					chunk.modules.forEach(function(module) {
						var idx = commonModules.indexOf(module);
						if(idx < 0) {
							commonModules.push(module);
							commonModulesCount.push(1);
						} else {
							commonModulesCount[idx]++;
						}
					});
				});
				commonModulesCount.forEach(function(count, idx) {
					var module = commonModules[idx];
					if(typeof minCount === "function") {
						if(!minCount(module, count))
							return;
					} else if(count < (minCount || Math.max(2, usedChunks.length))) {
						return;
					}
					usedChunks.forEach(function(chunk) {
						module.removeChunk(chunk);
					});
					commonChunk.addModule(module);
					module.addChunk(commonChunk);
				});
				usedChunks.forEach(function(chunk) {
					chunk.parents = [commonChunk];
					commonChunk.chunks.push(chunk);
					if(chunk.initial)
						commonChunk.initial = true;
					if(chunk.entry) {
						commonChunk.entry = true;
						chunk.entry = false;
					}
				});
				if(filenameTemplate)
					commonChunk.filenameTemplate = filenameTemplate;
			});
		});
	});
};
