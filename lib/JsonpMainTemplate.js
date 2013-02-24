/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var StringSource = require("webpack-core/lib/RawSource");

function JsonpMainTemplate(outputOptions) {
	this.outputOptions = outputOptions || {};
}
module.exports = JsonpMainTemplate;

var REGEXP_HASH = /\[hash\]/i;
var REGEXP_NAME = /\[name\]/g;
var REGEXP_ID = /\[id\]/i;
JsonpMainTemplate.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var jsonpFunction = this.outputOptions.jsonpFunction || ("webpackJsonp" + (this.outputOptions.library || ""));
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
	if(chunk.chunks.length > 0)
		addLine(1, "var installedChunks = {0:0};");
	addRequireFunc(1);
	addLine(1, "require.e = function requireEnsure(chunkId, callback) {");
	if(chunk.chunks.length == 0) {
		addLine(2, "callback.call(null, require);");
	} else {
		addLine(2, "if(installedChunks[chunkId] === 0) return callback.call(null, require);");
		addLine(2, "if(installedChunks[chunkId] !== undefined)");
		addLine(3, "installedChunks[chunkId].push(callback);");
		addLine(2, "else {");
		addLine(3, "installedChunks[chunkId] = [callback];");
		addLine(3, "var head = document.getElementsByTagName('head')[0];");
		addLine(3, "var script = document.createElement('script');");
		addLine(3, "script.type = 'text/javascript';");
		addLine(3, "script.charset = 'utf-8';");
		addLine(3, "script.src = modules.c+" + JSON.stringify(chunkFilename.replace(REGEXP_HASH, hash).replace(REGEXP_NAME, "")).replace(REGEXP_ID, "\"+chunkId+\"") + ";");
		addLine(3, "head.appendChild(script);");
		addLine(2, "}");
	}
	addLine(1, "};");
	addLine(1, "require.modules = modules;");
	addLine(1, "require.cache = installedModules;");
	if(chunk.chunks.length > 0) {
		addLine(1, "window[" + JSON.stringify(jsonpFunction) + "] = function webpackJsonpCallback(chunkIds, moreModules) {");
		addLine(2, "var moduleId, chunkId, callbacks = [];");
		addLine(2, "while(chunkIds.length) {");
		addLine(3, "chunkId = chunkIds.shift();");
		addLine(3, "if(installedChunks[chunkId]) callbacks.push.apply(callbacks, installedChunks[chunkId]);");
		addLine(3, "installedChunks[chunkId] = 0;");
		addLine(2, "}");
		addLine(2, "for(moduleId in moreModules)");
		addLine(3, "modules[moduleId] = moreModules[moduleId];");
		addLine(2, "while(callbacks.length)");
		addLine(3, "callbacks.shift().call(null, require);");
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

JsonpMainTemplate.prototype.updateHash = function(hash) {
	hash.update("jsonp");
	hash.update("2");
	hash.update(this.outputOptions.publicPath + "");
	hash.update(this.outputOptions.filename + "");
	hash.update(this.outputOptions.chunkFilename + "");
	hash.update(this.outputOptions.jsonpFunction + "");
};