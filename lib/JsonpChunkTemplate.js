/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RawSource = require("webpack-core/lib/RawSource");

function JsonpChunkTemplate(outputOptions) {
	this.outputOptions = outputOptions || {};
}
module.exports = JsonpChunkTemplate;

JsonpChunkTemplate.prototype.render = function(chunk, moduleTemplate, dependencyTemplates) {
	var jsonpFunction = this.outputOptions.jsonpFunction || ("webpackJsonp" + (this.outputOptions.library || ""));
	var buf = [];
	buf.push(jsonpFunction + "(" + JSON.stringify(chunk.ids) + ", {\n");
	chunk.modules.forEach(function(module, idx) {
		if(idx != 0) buf.push(",\n");
		buf.push("\n/***/ " + module.id + ":\n");
		var source = moduleTemplate.render(module, dependencyTemplates);
		buf.push(source.source());
	});
	buf.push("\n\n})");
	return new RawSource(buf.join(""));
};

JsonpChunkTemplate.prototype.updateHash = function(hash) {
	hash.update("jsonp");
	hash.update("2");
	hash.update(this.outputOptions.jsonpFunction + "");
	hash.update(this.outputOptions.library + "");
};