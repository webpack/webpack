/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function RemoveEmptyChunksPlugin() {}
module.exports = RemoveEmptyChunksPlugin;

RemoveEmptyChunksPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin(["optimize-chunks-basic", "optimize-extracted-chunks-basic"], function(chunks) {
			chunks.filter(function(chunk) {
				return chunk.isEmpty() && !chunk.hasRuntime() && !chunk.hasEntryModule();
			}).forEach(function(chunk) {
				chunk.remove("empty");
				chunks.splice(chunks.indexOf(chunk), 1);
			});
		});
	});
};
