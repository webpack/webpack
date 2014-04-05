/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var Template = require("./Template");

function AmdMainTemplateDecorator(mainTemplate, name) {
	this.mainTemplate = mainTemplate;
	this.name = name;
}
module.exports = AmdMainTemplateDecorator;
AmdMainTemplateDecorator.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var source = this.mainTemplate.render(hash, chunk, moduleTemplate, dependencyTemplates);
	var externals = chunk.modules.filter(function(m) {
		return m.external;
	});
	var externalsDepsArray = JSON.stringify(externals.map(function(m) {
		return typeof m.request === "object" ? m.request.amd : m.request;
	}));
	var externalsArguments = externals.map(function(m) {
		return "__WEBPACK_EXTERNAL_MODULE_" + m.id + "__";
	}).join(", ");
	if(this.name) {
		var name = this.name
			.replace(Template.REGEXP_CHUNKHASH, chunk.renderedHash)
			.replace(Template.REGEXP_ID, chunk.id)
			.replace(Template.REGEXP_NAME, chunk.name || "");
		return new ConcatSource("define(" + JSON.stringify(name) + ", " + externalsDepsArray + ", function(" + externalsArguments + ") { return ", source, "});");
	} else if(externalsArguments) {
		return new ConcatSource("define(" + externalsDepsArray + ", function(" + externalsArguments + ") { return ", source, "});");
	} else {
		return new ConcatSource("define(function() { return ", source, "});");
	}
};
AmdMainTemplateDecorator.prototype.updateHash = function(hash) {
	hash.update("exports amd");
	hash.update(this.name + "");
	this.mainTemplate.updateHash(hash);
};