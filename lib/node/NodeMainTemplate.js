/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var MainTemplate = require("../MainTemplate");
var Template = require("../Template");

function NodeMainTemplate(outputOptions, asyncChunkLoading) {
	MainTemplate.call(this, outputOptions);
	this.asyncChunkLoading = asyncChunkLoading;
}
module.exports = NodeMainTemplate;

NodeMainTemplate.prototype = Object.create(MainTemplate.prototype);

NodeMainTemplate.prototype.requireFn = "webpackRequire";
NodeMainTemplate.prototype.renderLocalVars = function(hash, chunk) {
	var buf = MainTemplate.prototype.renderLocalVars.call(this, hash, chunk);
	if(chunk.chunks.length > 0) {
		buf.push(
			"",
			"// object to store loaded chunks",
			'// "1" means "already loaded"',
			"var installedChunks = {",
			this.indent(
				chunk.ids.map(function(id) {
					return id + ":1"
				}).join(",\n")
			),
			"};"
		);
	}
	return buf;
};

NodeMainTemplate.prototype.renderRequireEnsure = function(hash, chunk) {
	var filename = this.outputOptions.filename || "bundle.js";
	var chunkFilename = this.outputOptions.chunkFilename || "[id]." + filename;
	var insertMoreModules = [
		"var moreModules = chunk.modules, chunkIds = chunk.ids;",
		"for(var moduleId in moreModules) {",
		this.indent(this.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
		"}"
	];
	if(this.asyncChunkLoading) {
		return [
			"if(installedChunks[chunkId] === 1) callback.call(null, " + this.requireFn + ");",
			"else if(!installedChunks[chunkId]) {",
			this.indent([
				"installedChunks[chunkId] = [callback];",
				"var filename = __dirname + " + JSON.stringify("/" + chunkFilename
						.replace(Template.REGEXP_HASH, hash)
						.replace(Template.REGEXP_NAME, ""))
					.replace(Template.REGEXP_ID, "\" + chunkId + \"") + ";",
				"require('fs').readFile(filename, 'utf-8',  function(err, content) {",
				this.indent([
					"if(err) { if(" + this.requireFn + ".onerror) return " + this.requireFn + ".onerror(err); else throw err; }",
					"var chunk = {};",
					"require('vm').runInThisContext('(function(exports) {' + content + '\\n})', filename)(chunk);",
				].concat(insertMoreModules).concat([
					"var callbacks = [];",
					"for(var i = 0; i < chunkIds.length; i++) {",
					this.indent([
						"if(Array.isArray(installedChunks[chunkIds[i]]))",
						this.indent([
							"callbacks = callbacks.concat(installedChunks[chunkIds[i]]);"
						]),
						"installedChunks[chunkIds[i]] = 1;"
					]),
					"}",
					"for(i = 0; i < callbacks.length; i++)",
					this.indent("callbacks[i].call(null, " + this.requireFn + ");")
				])),
				"});"
			]),
			"} else installedChunks[chunkId].push(callback);",
		];
	} else {
		return [
			"// \"1\" is the signal for \"already loaded\"",
			"if(!installedChunks[chunkId]) {",
			this.indent([
				"var chunk = require(" +
					JSON.stringify("./" + chunkFilename
						.replace(Template.REGEXP_HASH, hash)
						.replace(Template.REGEXP_NAME, ""))
					.replace(Template.REGEXP_ID, "\" + chunkId + \"") + ");"
			].concat(insertMoreModules).concat([
				"for(var i = 0; i < chunkIds.length; i++)",
				this.indent("installedChunks[chunkIds[i]] = 1;"),
			])),
			"}",
			"callback.call(null, " + this.requireFn + ");",
		];
	}
};

NodeMainTemplate.prototype.renderRequireExtensions = function(hash, chunk) {
	var buf = MainTemplate.prototype.renderRequireExtensions.call(this, hash, chunk);
	buf.push(this.requireFn + ".parentRequire = require;");
	return buf;
};

NodeMainTemplate.prototype.updateHash = function(hash) {
	MainTemplate.prototype.updateHash.call(this, hash);
	hash.update("node");
	hash.update("3");
	hash.update(this.outputOptions.filename + "");
	hash.update(this.outputOptions.chunkFilename + "");
};