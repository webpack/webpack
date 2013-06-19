/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var MainTemplate = require("./MainTemplate");
var Template = require("./Template");

function JsonpMainTemplate(outputOptions) {
	MainTemplate.call(this, outputOptions);
}
module.exports = JsonpMainTemplate;

JsonpMainTemplate.prototype = Object.create(MainTemplate.prototype);

JsonpMainTemplate.prototype.renderLocalVars = function(hash, chunk) {
	var buf = MainTemplate.prototype.renderLocalVars.call(this, hash, chunk);
	if(chunk.chunks.length > 0) {
		buf.push(
			"",
			"// object to store loaded and loading chunks",
			'// "0" means "already loaded"',
			'// Array means "loading", array contains callbacks',
			"var installedChunks = {0:0};"
		);
	}
	return buf;
};

JsonpMainTemplate.prototype.renderRequireEnsure = function(hash, chunk) {
	var filename = this.outputOptions.filename || "bundle.js";
	var chunkFilename = this.outputOptions.chunkFilename || "[id]." + filename;
	var chunkHashMap = {};
	(function addChunk(c) {
		if(chunkHashMap[c.id]) return;
		if(c.id > 0)
			chunkHashMap[c.id] = c.renderedHash;
		c.chunks.forEach(addChunk);
	}(chunk));
	return [
		"// \"0\" is the signal for \"already loaded\"",
		"if(installedChunks[chunkId] === 0)",
		this.indent("return callback.call(null, require);"),
		"",
		"// an array means \"currently loading\".",
		"if(installedChunks[chunkId] !== undefined) {",
		this.indent("installedChunks[chunkId].push(callback);"),
		"} else {",
		this.indent([
			"// start chunk loading",
			"installedChunks[chunkId] = [callback];",
			"var head = document.getElementsByTagName('head')[0];",
			"var script = document.createElement('script');",
			"script.type = 'text/javascript';",
			"script.charset = 'utf-8';",
			"script.src = modules.c + " + 
				JSON.stringify(chunkFilename
					.replace(Template.REGEXP_NAME, ""))
				.replace(Template.REGEXP_HASH, "\" + " + this.renderCurrentHashCode(hash) + " + \"")
				.replace(Template.REGEXP_CHUNKHASH, "\" + " + JSON.stringify(chunkHashMap) + "[chunkId] + \"")
				.replace(Template.REGEXP_ID, "\" + chunkId + \"") + ";",
			"head.appendChild(script);"
		]),
		"}"
	];
};

JsonpMainTemplate.prototype.renderInit = function(hash, chunk) {
	var buf = MainTemplate.prototype.renderInit.call(this, hash, chunk);
	if(chunk.chunks.length > 0) {
		var jsonpFunction = this.outputOptions.jsonpFunction || ("webpackJsonp" + (this.outputOptions.library || ""));
		buf.push(
			"",
			"// install a JSONP callback for chunk loading",
			"window[" + JSON.stringify(jsonpFunction) + "] = function webpackJsonpCallback(chunkIds, moreModules) {",
			this.indent([
				'// add "moreModules" to the modules object,',
				'// then flag all "chunkIds" as loaded and fire callback',
				"var moduleId, chunkId, callbacks = [];",
				"while(chunkIds.length) {",
				this.indent([
					"chunkId = chunkIds.shift();",
					"if(installedChunks[chunkId])",
					this.indent("callbacks.push.apply(callbacks, installedChunks[chunkId]);"),
					"installedChunks[chunkId] = 0;"
				]),
				"}",
				"for(moduleId in moreModules) {",
				this.indent(this.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
				"}",
				"while(callbacks.length)",
				this.indent("callbacks.shift().call(null, " + this.requireFn + ");"),
			]),
			"};"
		);
	}
	return buf;
};

JsonpMainTemplate.prototype.renderCurrentHashCode = function(hash) {
	return JSON.stringify(hash);
};

JsonpMainTemplate.prototype.updateHash = function(hash) {
	MainTemplate.prototype.updateHash.call(this, hash);
	hash.update("jsonp");
	hash.update("3");
	hash.update(this.outputOptions.filename + "");
	hash.update(this.outputOptions.chunkFilename + "");
	hash.update(this.outputOptions.jsonpFunction + "");
	hash.update(this.outputOptions.library + "");
};