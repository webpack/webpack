/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");

function AmdMainTemplateDecorator(mainTemplate, name) {
	this.mainTemplate = mainTemplate;
	this.name = name;
}
module.exports = AmdMainTemplateDecorator;
AmdMainTemplateDecorator.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var source = this.mainTemplate.render(hash, chunk, moduleTemplate, dependencyTemplates);
	if(this.name) {
		return new ConcatSource("define(" + JSON.stringify(this.name) + ", [], function() { return ", source, "});");
	} else {
		return new ConcatSource("define(function() { return ", source, "});");
	}
};
AmdMainTemplateDecorator.prototype.updateHash = function(hash) {
	hash.update("exports amd");
	hash.update(this.name + "");
	this.mainTemplate.updateHash(hash);
};