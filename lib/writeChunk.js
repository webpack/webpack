/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var writeSource = require("./writeSource");

/**
 * return the content of a chunk:
 * [id]: function(...) {
 *    [source]
 * },
 */
module.exports = function(depTree, chunk, options) {
	if(!options) {
		options = chunk;
		chunk = null;
	}
	var buffer = [];
	var modules = chunk ? chunk.modules : depTree.modules;
	var includedModules = [];
	for(var moduleId in modules) {
		if(chunk) {
			if(chunk.modules[moduleId] !== "include")
				continue;
		}
		var module = depTree.modules[moduleId];
		includedModules.push(module);
	}
	if(options.includeFilenames)
		var shortenFilename = require("./createFilenameShortener")(options.context);
	includedModules.sort(function(a, b) { return a.realId - b.realId; });
	includedModules.forEach(function(module, idx) {
		buffer.push("/******/");
		buffer.push(module.realId);
		buffer.push(": function(module, exports, require) {\n\n");
		if(options.includeFilenames) {
			buffer.push("/*** ");
			buffer.push(shortenFilename(module.request || module.dirname));
			buffer.push(" ***/\n\n");
		}
		buffer.push(writeSource(module, options,
			function(id) { return depTree.modules[id].realId },
			function(id) { return depTree.chunks[id].realId }));
		if(idx === includedModules.length - 1)
			buffer.push("\n\n/******/}\n");
		else
			buffer.push("\n\n/******/},\n/******/\n");
	});
	return buffer.join("");
}