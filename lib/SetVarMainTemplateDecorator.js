/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");

function SetVarMainTemplateDecorator(mainTemplate, varExpression) {
	this.mainTemplate = mainTemplate;
	this.varExpression = varExpression;
}
module.exports = SetVarMainTemplateDecorator;
SetVarMainTemplateDecorator.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var source = this.mainTemplate.render(hash, chunk, moduleTemplate, dependencyTemplates);
	var prefix = this.varExpression + " =\n";
	return new ConcatSource(prefix, source);
};
SetVarMainTemplateDecorator.prototype.updateHash = function(hash) {
	hash.update("set var");
	hash.update(this.varExpression);
	this.mainTemplate.updateHash(hash);
};