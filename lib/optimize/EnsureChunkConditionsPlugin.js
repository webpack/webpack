/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function EnsureChunkConditionsPlugin() {}
module.exports = EnsureChunkConditionsPlugin;

EnsureChunkConditionsPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin(["optimize-chunks-basic", "optimize-extracted-chunks-basic"], function(chunks) {
			var changed = false;
			chunks.forEach(function(chunk) {
				chunk.modules.slice().forEach(function(module) {
					if(!module.chunkCondition) return;
					if(!module.chunkCondition(chunk)) {
						chunk.parents.forEach(function(parent) {
							parent.addModule(module);
						});
						module.rewriteChunkInReasons(chunk, chunk.parents);
						chunk.removeModule(module);
						changed = true;
					}
				});
			});
			if(changed) return true;
		});
	});
};
