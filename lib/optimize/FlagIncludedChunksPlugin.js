/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function FlagIncludedChunksPlugin() {}
module.exports = FlagIncludedChunksPlugin;

FlagIncludedChunksPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-chunk-ids", function(chunks) {
			chunks.forEach(function(chunkA) {
				chunks.forEach(function(chunkB) {
					if(chunkA === chunkB) return;
					// is chunkB in chunkA?
					if(chunkA.modules.length < chunkB.modules.length) return;
					for(var i = 0; i < chunkB.modules.length; i++) {
						if(chunkA.modules.indexOf(chunkB.modules[i]) < 0) return;
					}
					chunkA.ids.push(chunkB.id);
				});
			});
		});
	});
};
