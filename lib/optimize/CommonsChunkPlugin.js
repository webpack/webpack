/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function CommonsChunkPlugin(chunkName, filenameTemplate, entryPoints, minCount) {
	if(typeof filenameTemplate !== "string") {
		minCount = entryPoints;
		entryPoints = filenameTemplate
		filenameTemplate = chunkName;
	}
	if(typeof entryPoints === "number") {
		minCount = entryPoints;
		entryPoints = undefined;
	}
	this.chunkName = chunkName;
	this.filenameTemplate = filenameTemplate;
	this.minCount = minCount;
	this.entryPoints = entryPoints;
}
module.exports = CommonsChunkPlugin;
CommonsChunkPlugin.prototype.apply = function(compiler) {
	var chunkName = this.chunkName;
	var filenameTemplate = this.filenameTemplate;
	var minCount = this.minCount;
	var entryPoints = this.entryPoints;
	compiler.plugin("this-compilation", function(compilation) {
		compilation.plugin("optimize-chunks", function(chunks) {
			var commonModulesCount = [];
			var commonModules = [];
			var commonChunk = this.addChunk(chunkName);
			var usedChunks = chunks.filter(function(chunk) {
				if(chunk === commonChunk) return false;
				if(!chunk.entry) return false;
				if(!entryPoints) return true;
				return entryPoints.indexOf(chunk.name) >= 0;
			});
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
				if(count >= (minCount || Math.max(2, usedChunks.length))) {
					var module = commonModules[idx];
					usedChunks.forEach(function(chunk) {
						module.removeChunk(chunk);
					});
					commonChunk.addModule(module);
					module.addChunk(commonChunk);
				}
			});
			usedChunks.forEach(function(chunk) {
				chunk.parents = [commonChunk];
				commonChunk.chunks.push(chunk);
				chunk.entry = false;
			});
			commonChunk.initial = commonChunk.entry = true;
			commonChunk.filenameTemplate = filenameTemplate;
		});
	});
};
