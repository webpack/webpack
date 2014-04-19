/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var Template = require("./Template");

function JsonpExportMainTemplateDecorator(mainTemplate, name) {
	this.mainTemplate = mainTemplate;
	this.name = name;
}
module.exports = JsonpExportMainTemplateDecorator;
JsonpExportMainTemplateDecorator.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var source = this.mainTemplate.render(hash, chunk, moduleTemplate, dependencyTemplates);
	var name = (this.name || "")
		.replace(Template.REGEXP_HASH, hash)
		.replace(Template.REGEXP_CHUNKHASH, chunk.renderedHash)
		.replace(Template.REGEXP_ID, chunk.id)
		.replace(Template.REGEXP_NAME, chunk.name || "");
	return new ConcatSource(name + "(", source, ");");
};

SetVarMainTemplateDecorator.prototype.useChunkHash = function(chunk) {
	if(!this.mainTemplate.useChunkHash || !this.mainTemplate.useChunkHash(chunk)) return false;
	return !Template.REGEXP_HASH.test(this.name || "");
};

JsonpExportMainTemplateDecorator.prototype.updateHash = function(hash) {
	hash.update("jsonp export");
	hash.update(this.name + "");
	this.mainTemplate.updateHash(hash);
};