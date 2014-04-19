/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var Template = require("./Template");

function SetVarMainTemplateDecorator(mainTemplate, varExpression, copyObject) {
	this.mainTemplate = mainTemplate;
	this.varExpression = varExpression;
	this.copyObject = copyObject;
}
module.exports = SetVarMainTemplateDecorator;
SetVarMainTemplateDecorator.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var source = this.mainTemplate.render(hash, chunk, moduleTemplate, dependencyTemplates);
	var varExpression = this.varExpression
		.replace(Template.REGEXP_HASH, hash)
		.replace(Template.REGEXP_CHUNKHASH, chunk.renderedHash)
		.replace(Template.REGEXP_ID, chunk.id)
		.replace(Template.REGEXP_NAME, chunk.name || "");
	if(this.copyObject) {
		return new ConcatSource("(function(e, a) { for(var i in a) e[i] = a[i]; }(" +
			varExpression + ", ", source, "))");
	} else {
		var prefix = varExpression + " =\n";
		return new ConcatSource(prefix, source);
	}
};

SetVarMainTemplateDecorator.prototype.useChunkHash = function(chunk) {
	if(!this.mainTemplate.useChunkHash || !this.mainTemplate.useChunkHash(chunk)) return false;
	return !Template.REGEXP_HASH.test(this.varExpression || "");
};

SetVarMainTemplateDecorator.prototype.updateHash = function(hash) {
	hash.update("set var");
	hash.update(this.varExpression + "");
	hash.update(this.copyObject + "");
	this.mainTemplate.updateHash(hash);
};