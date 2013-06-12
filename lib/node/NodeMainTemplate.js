/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var MainTemplate = require("../MainTemplate");
var Template = require("../Template");

function NodeMainTemplate(outputOptions) {
	MainTemplate.call(this, outputOptions);
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
			"var installedChunks = {0:1};"
		);
	}
	return buf;
};

NodeMainTemplate.prototype.renderRequireEnsure = function(hash, chunk) {
	var filename = this.outputOptions.filename || "bundle.js";
	var chunkFilename = this.outputOptions.chunkFilename || "[id]." + filename;
	return [
		"// \"1\" is the signal for \"already loaded\"",
		"if(!installedChunks[chunkId]) {",
		this.indent([
			"var chunk = require(" +
				JSON.stringify("./" + chunkFilename
					.replace(Template.REGEXP_HASH, hash)
					.replace(Template.REGEXP_NAME, ""))
				.replace(Template.REGEXP_ID, "\" + chunkId + \"") + ");",
			"var moreModules = chunk.modules, chunkIds = chunk.ids;",
			"for(var moduleId in moreModules) {",
			this.indent(this.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
			"}",
			"for(var i = 0; i < chunkIds.length; i++)",
			this.indent("installedChunks[chunkIds[i]] = 1;"),
		]),
		"}",
		"callback.call(null, " + this.requireFn + ");",
	];
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