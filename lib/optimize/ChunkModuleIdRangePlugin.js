/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ChunkModuleIdRangePlugin(options) {
	this.options = options;
}
module.exports = ChunkModuleIdRangePlugin;
ChunkModuleIdRangePlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("module-ids", function(modules) {
			var chunk = this.chunks.filter(function(chunk) {
				return chunk.name === options.name;
			})[0];
			if(!chunk) throw new Error("ChunkModuleIdRangePlugin: Chunk with name '" + options.name + "' was not found");
			var currentId = options.start;
			var chunkModules;
			if(options.order) {
				chunkModules = chunk.modules.slice();
				switch(options.order) {
					case "index":
						chunkModules.sort(function(a, b) {
							return a.index - b.index;
						});
						break;
					case "index2":
						chunkModules.sort(function(a, b) {
							return a.index2 - b.index2;
						});
						break;
					default:
						throw new Error("ChunkModuleIdRangePlugin: unexpected value of order");
				}

			} else {
				chunkModules = modules.filter(function(m) {
					return m.chunks.indexOf(chunk) >= 0;
				});
			}
			console.log(chunkModules);
			for(var i = 0; i < chunkModules.length; i++) {
				var m = chunkModules[i];
				if(m.id === null) {
					m.id = currentId++;
				}
				if(options.end && currentId > options.end)
					break;
			}
		});
	});
};
