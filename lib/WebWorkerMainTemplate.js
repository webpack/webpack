/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var StringSource = require("webpack-core/lib/RawSource");

function WebWorkerMainTemplate(outputOptions) {
	this.outputOptions = outputOptions || {};
}
module.exports = WebWorkerMainTemplate;

var REGEXP_HASH = /\[hash\]/i;
var REGEXP_NAME = /\[name\]/g;
var REGEXP_ID = /\[id\]/i;
WebWorkerMainTemplate.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var chunkCallbackName = this.outputOptions.chunkCallbackName || ("webpackChunk" + (this.outputOptions.library || ""));
	var publicPath = this.outputOptions.publicPath || "";
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
		addLine(i+0, "function require(moduleId) {");
		addLine(i+1, "if(typeof moduleId !== \"number\") throw new Error(\"Cannot find module '\"+moduleId+\"'\");");
		addLine(i+1, "if(installedModules[moduleId])");
		addLine(i+2, "return installedModules[moduleId].exports;");
		addLine(i+1, "var module = installedModules[moduleId] = {");
		addLine(i+2, "exports: {},");
		addLine(i+2, "id: moduleId,");
		addLine(i+2, "loaded: false");
		addLine(i+1, "};");
		addLine(i+1, "modules[moduleId].call(null, module, module.exports, require);");
		addLine(i+1, "module.loaded = true;");
		addLine(i+1, "return module.exports;");
		addLine(i+0, "}");
	}
	addLine(0, "(function webpackBootstrap(modules) {");
	addLine(1, "var installedModules = {};");
	addRequireFunc(1);
	addLine(1, "require.e = function requireEnsure(chunkId, callback) {");
	if(chunk.chunks.length == 0) {
		addLine(2, "callback.call(null, require);");
	} else {
		addLine(2, "if(installedChunks[chunkId] === 1) return callback.call(null, require);");
		addLine(2, "importScripts(" + JSON.stringify(chunkFilename.replace(REGEXP_HASH, hash).replace(REGEXP_NAME, "")).replace(REGEXP_ID, "\"+chunkId+\"") + ");");
		addLine(2, "callback.call(null, require);");
	}
	addLine(1, "};");
	addLine(1, "require.modules = modules;");
	addLine(1, "require.cache = installedModules;");
	if(chunk.chunks.length > 0) {
		addLine(1, "var installedChunks = {0:1};");
		addLine(1, "this[" + JSON.stringify(chunkCallbackName) + "] = function webpackChunkCallback(moreModules) {");
		addLine(2, "for(var moduleId in moreModules)");
		addLine(3, "modules[moduleId] = moreModules[moduleId];");
		addLine(1, "};");
	}
	addLine(1, "return require(0);");
	addLine(0, "})({");
	addLine(0, "c: " + JSON.stringify(publicPath.replace(REGEXP_HASH, hash)) + ",");
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

WebWorkerMainTemplate.prototype.updateHash = function(hash) {
	hash.update("webworker");
	hash.update("1");
	hash.update(this.outputOptions.publicPath + "");
	hash.update(this.outputOptions.filename + "");
	hash.update(this.outputOptions.chunkFilename + "");
	hash.update(this.outputOptions.chunkCallbackName + "");
};