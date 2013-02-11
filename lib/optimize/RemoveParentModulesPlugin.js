/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function hasModule(chunk, module, checkedChunks) {
	if(chunk.modules.indexOf(module) >= 0) return true;
	if(chunk.entry) return false;
	return allHaveModule(chunk.parents.filter(function(c) {
		return checkedChunks.indexOf(c) < 0;
	}), module, checkedChunks);
}

function allHaveModule(someChunks, module, checkedChunks) {
	if(!checkedChunks) checkedChunks = [];
	for(var i = 0; i < someChunks.length; i++) {
		checkedChunks.push(someChunks[i]);
		if(!hasModule(someChunks[i], module, checkedChunks)) return false;
	}
	return true;
}

function RemoveParentModulesPlugin() {
}
module.exports = RemoveParentModulesPlugin;

RemoveParentModulesPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-chunks", function(chunks) {
			chunks.forEach(function(chunk) {
				chunk.modules.slice().forEach(function(module) {
					if(chunk.entry) return;
					if(allHaveModule(chunk.parents, module)) {
						chunk.removeModule(module);
					}
				});
			});
		});
	});
};

