/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function MergeDuplicateChunksPlugin() {}
module.exports = MergeDuplicateChunksPlugin;

function getChunkIdentifier(chunk) {
	return chunk.modules.map(function(m) {
		return m.identifier();
	}).sort().join(", ");
}

MergeDuplicateChunksPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-chunks", function(chunks) {
			var map = {};
			chunks.slice().forEach(function(chunk) {
				if(chunk.initial) return;
				var ident = getChunkIdentifier(chunk);
				if(map[ident]) {
					if(map[ident].integrate(chunk, "duplicate"))
						chunks.splice(chunks.indexOf(chunk), 1);
					return;
				}
				map[ident] = chunk;
			});
		});
	});
};
