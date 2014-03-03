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
NodeMainTemplate.prototype.constructor = NodeMainTemplate;

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
					"if(err) { if(" + this.requireFn + ".onError) return " + this.requireFn + ".onError(err); else throw err; }",
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

NodeMainTemplate.prototype.renderHotModuleReplacementInit = function(hash, chunk) {
	var hotUpdateChunkFilename = this.outputOptions.hotUpdateChunkFilename;
	var hotUpdateMainFilename = this.outputOptions.hotUpdateMainFilename;
	var hotUpdateFunction = this.outputOptions.hotUpdateFunction || ("webpackHotUpdate" + (this.outputOptions.library || ""));
	var currentHotUpdateChunkFilename = JSON.stringify(hotUpdateChunkFilename)
		.replace(Template.REGEXP_HASH, "\" + " + this.renderCurrentHashCode(hash) + " + \"")
		.replace(Template.REGEXP_ID, "\" + chunkId + \"");
	var currentHotUpdateMainFilename = JSON.stringify(hotUpdateMainFilename)
		.replace(Template.REGEXP_HASH, "\" + " + this.renderCurrentHashCode(hash) + " + \"");
	return Template.getFunctionContent(this.asyncChunkLoading ? function() {
		function hotDownloadUpdateChunk(chunkId) {
			var filename = require("path").join(__dirname, $hotChunkFilename$);
			require("fs").readFile(filename, "utf-8", function(err, content) {
				if(err) {
					if($require$.onError)
						return $require$.onError(err);
					else
						throw err;
				}
				var chunk = {};
				require("vm").runInThisContext("(function(exports) {" + content + "\n})", filename)(chunk);
				hotAddUpdateChunk(chunk.id, chunk.modules);
			});
		}

		function hotDownloadManifest(callback) {
			var filename = require("path").join(__dirname, $hotMainFilename$);
			require("fs").readFile(filename, "utf-8", function(err, content) {
				if(err) return callback();
				try {
					var update = JSON.parse(content);
				} catch(e) {
					return callback(e);
				}
				callback(null, update);
			});
		}
	} : function() {
		function hotDownloadUpdateChunk(chunkId) {
			var chunk = require("./" + $hotChunkFilename$);
			hotAddUpdateChunk(chunk.id, chunk.modules);
		}

		function hotDownloadManifest(callback) {
			try {
				var update = require("./" + $hotMainFilename$);
			} catch(e) {
				return callback();
			}
			callback(null, update);
		}
	})
		.replace(/\$require\$/g, this.requireFn)
		.replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
		.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename);
};

NodeMainTemplate.prototype.updateHash = function(hash) {
	MainTemplate.prototype.updateHash.call(this, hash);
	hash.update("node");
	hash.update("3");
	hash.update(this.outputOptions.filename + "");
	hash.update(this.outputOptions.chunkFilename + "");
};