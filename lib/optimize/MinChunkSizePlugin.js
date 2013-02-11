/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function chunkSizeWithModules(modules) {
	return modules.map(function(m) {
		return m.size();
	}).reduce(function(a, b) {
		return a + b;
	});
}

function MinChunkSizePlugin(minChunkSize) {
	this.minChunkSize = minChunkSize;
}
module.exports = MinChunkSizePlugin;

MinChunkSizePlugin.prototype.apply = function(compiler) {
	var minChunkSize = this.minChunkSize;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-chunks", function(chunks) {

			var argumentedChunks = chunks.map(function(chunk) {
				return {
					size: chunkSizeWithModules(chunk.modules),
					entry: !!chunk.entry,
					chunk: chunk
				}
			}).sort(function(a, b) {
				if(a.entry != b.entry) {
					return a.entry ? 1 : -1;
				}
				return b.size - a.size;
			});

			if(argumentedChunks[0].size < minChunkSize) {
				for(var i = 1; i < argumentedChunks.length; i++) {
					if(argumentedChunks[i].size + argumentedChunks[0].size >= minChunkSize)
						break;
				}
				if(i == argumentedChunks.length) i = 1;
				if(argumentedChunks[i]) {
					argumentedChunks[i].chunk.integrate(argumentedChunks[0].chunk, "min-size");
					chunks.splice(chunks.indexOf(argumentedChunks[0].chunk), 1);
					this.restartApplyPlugins();
				}
			}
		});
	});
};

