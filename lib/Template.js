/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");

function Template(outputOptions) {
	this.outputOptions = outputOptions || {};
}
module.exports = Template;

Template.REGEXP_HASH = /\[hash\]/gi;
Template.REGEXP_CHUNKHASH = /\[chunkhash\]/gi;
Template.REGEXP_NAME = /\[name\]/gi;
Template.REGEXP_ID = /\[id\]/gi;
Template.REGEXP_FILE = /\[file\]/gi;
Template.REGEXP_QUERY = /\[query\]/gi;
Template.REGEXP_FILEBASE = /\[filebase\]/gi;

Template.prototype.indent = function indent(str) {
	if(Array.isArray(str)) {
		return str.map(indent).join("\n");
	} else {
		return "\t" + str.trimRight().replace(/\n/g, "\n\t");
	}
};

Template.prototype.prefix = function(str, prefix) {
	if(Array.isArray(str)) {
		str = str.join("\n");
	}
	return prefix + str.trim().replace(/\n/g, "\n" + prefix);
};

Template.prototype.asString = function(str) {
	if(Array.isArray(str)) {
		return str.join("\n");
	}
	return str;
};

Template.prototype.renderChunkModules = function(chunk, moduleTemplate, dependencyTemplates, prefix) {
	if(!prefix) prefix = "";
	var source = new ConcatSource();
	if(chunk.modules.length === 0) {
		source.add("[]");
		return source;
	}
	var maxId = chunk.modules[chunk.modules.length-1].id;
	var minId = chunk.modules[0].id;
	if(minId < 16 + (""+minId).length) {
		minId = 0;
	}
	var objectOverhead = chunk.modules.map(function(module) {
		return (module.id + "").length + 2;
	}).reduce(function(a, b) { return a + b }, -1);
	var arrayOverhead = minId === 0 ? maxId : 16 + (""+minId).length + maxId;
	if(arrayOverhead < objectOverhead) {
		// Render a sparse array
		if(minId !== 0) source.add("Array(" + minId + ").concat(");
		source.add("[\n");
		var modules = {};
		chunk.modules.forEach(function(module) {
			modules[module.id] = module;
		});
		for(var idx = minId; idx <= maxId; idx++) {
			var module = modules[idx];
			if(idx != minId) source.add(",\n");
			source.add("/* " + idx + " */");
			if(module) {
				source.add("\n");
				source.add(moduleTemplate.render(module, dependencyTemplates, chunk));
			}
		}
		source.add("\n" + prefix + "]");
		if(minId !== 0) source.add(")");
	} else {
		// Render an object
		source.add("{\n");
		chunk.modules.forEach(function(module, idx) {
			if(idx != 0) source.add(",\n");
			source.add("\n/***/ " + module.id + ":\n");
			source.add(moduleTemplate.render(module, dependencyTemplates, chunk));
		});
		source.add("\n\n" + prefix + "}");
	}
	return source;
};

Template.getFunctionContent = function(fn) {
	return fn.toString().replace(/^function\s?\(\)\s?\{\n?|\n?\}$/g, "").replace(/^\t/mg, "");
};