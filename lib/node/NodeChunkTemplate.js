/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RawSource = require("webpack-core/lib/RawSource");

function NodeChunkTemplate(outputOptions) {
	this.outputOptions = outputOptions || {};
}
module.exports = NodeChunkTemplate;

NodeChunkTemplate.prototype.render = function(chunk, moduleTemplate, dependencyTemplates) {
	var buf = [];
	buf.push("exports.ids = " + JSON.stringify(chunk.ids) + ";\n");
	buf.push("exports.modules = {\n");
	chunk.modules.forEach(function(module, idx) {
		if(idx != 0) buf.push(",\n");
		buf.push("\n/***/ " + module.id + ":\n");
		var source = moduleTemplate.render(module, dependencyTemplates);
		buf.push(source.source());
	});
	buf.push("\n\n};");
	return new RawSource(buf.join(""));
};

NodeChunkTemplate.prototype.updateHash = function(hash) {
	hash.update("node");
	hash.update("2");
};