/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function CommonsChunkPlugin(name, minCount) {
	this.name = name;
	this.minCount = minCount || 2;
}
module.exports = CommonsChunkPlugin;
CommonsChunkPlugin.prototype.apply = function(compiler) {
	var name = this.name;
	var minCount = this.minCount;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-chunks", function(chunks) {
			var commonModulesCount = [];
			var commonModules = [];
			chunks.forEach(function(chunk) {
				if(chunk.entry) {
					chunk.modules.forEach(function(module) {
						var idx = commonModules.indexOf(module);
						if(idx < 0) {
							commonModules.push(module);
							commonModulesCount.push(1);
						} else {
							commonModulesCount[idx]++;
						}
					});
				}
			});
			var commonChunk = this.addChunk(name);
			commonModulesCount.forEach(function(count, idx) {
				if(count >= minCount) {
					var module = commonModules[idx];
					module.chunks.slice().forEach(function(chunk) {
						module.removeChunk(chunk);
					});
					commonChunk.addModule(module);
					module.addChunk(commonChunk);
				}
			});
			chunks.forEach(function(chunk) {
				if(chunk.entry) {
					chunk.parents = [commonChunk];
					commonChunk.chunks.push(chunk);
					chunk.entry = false;
				}
			});
			commonChunk.entry = true;
			commonChunk.id = 0;
		});
	});
};