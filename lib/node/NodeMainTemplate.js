/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var StringSource = require("webpack-core/lib/RawSource");

function NodeMainTemplate(outputOptions) {
	this.outputOptions = outputOptions || {};
}
module.exports = NodeMainTemplate;

var REGEXP_HASH = /\[hash\]/i;
var REGEXP_NAME = /\[name\]/g;
var REGEXP_ID = /\[id\]/i;
NodeMainTemplate.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var filename = this.outputOptions.filename || "bundle.js";
	var chunkFilename = this.outputOptions.chunkFilename || "[id]." + filename;
	var buf = [];
	function addLine(indent, line) {
		buf.push("/******/ ");
		for(var i = 0; i < indent; i++)
			buf.push("\t");
		buf.push(line);
		buf.push("\n");
	}
	function addRequireFunc(i) {
		addLine(i+0, "function __require(moduleId) {");
		addLine(i+1, "if(installedModules[moduleId])");
		addLine(i+2, "return installedModules[moduleId].exports;");
		addLine(i+1, "var module = installedModules[moduleId] = {");
		addLine(i+2, "exports: {},");
		addLine(i+2, "id: moduleId,");
		addLine(i+2, "loaded: false");
		addLine(i+1, "};");
		addLine(i+1, "modules[moduleId].call(null, module, module.exports, __require);");
		addLine(i+1, "module.loaded = true;");
		addLine(i+1, "return module.exports;");
		addLine(i+0, "}");
	}
	addLine(0, "(function webpackBootstrap(modules) {");
	addLine(1, "var installedModules = {};");
	addRequireFunc(1);
	addLine(1, "__require.e = function requireEnsure(chunkId, callback) {");
	if(chunk.chunks.length == 0) {
		addLine(2, "callback.call(null, __require);");
	} else {
		addLine(2, "if(installedChunks[chunkId] === 1) return callback.call(null, __require);");
		addLine(2, "var chunk = require(" + JSON.stringify("./" + chunkFilename.replace(REGEXP_HASH, hash).replace(REGEXP_NAME, "")).replace(REGEXP_ID, "\"+chunkId+\"") + ");");
		addLine(2, "var moreModules = chunk.modules, chunkIds = chunk.ids;");
		addLine(2, "for(var moduleId in moreModules)");
		addLine(3, "modules[moduleId] = moreModules[moduleId];");
		addLine(2, "for(var i = 0; i < chunkIds.length; i++)");
		addLine(3, "installedChunks[chunkIds[i]] = 1;");
		addLine(2, "callback.call(null, __require);");
	}
	addLine(1, "};");
	addLine(1, "__require.modules = modules;");
	addLine(1, "__require.cache = installedModules;");
	addLine(1, "__require.parentRequire = require;");
	if(chunk.chunks.length > 0) {
		addLine(1, "var installedChunks = {0:1};");
	}
	addLine(1, "return __require(0);");
	addLine(0, "})({");
	addLine(0, "c: __dirname,");
	chunk.modules.forEach(function(module, idx) {
		if(idx != 0) buf.push(",\n");
		buf.push("\n/***/ " + module.id + ":\n");
		var source = moduleTemplate.render(module, dependencyTemplates);
		buf.push(source.source());
	});
	buf.push("\n");
	addLine(0, "})");
	return new StringSource(buf.join(""));
};

NodeMainTemplate.prototype.updateHash = function(hash) {
	hash.update("node");
	hash.update("2");
	hash.update(this.outputOptions.filename + "");
	hash.update(this.outputOptions.chunkFilename + "");
};