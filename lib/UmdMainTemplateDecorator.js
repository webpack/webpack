/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var OriginalSource = require("webpack-core/lib/OriginalSource");

function UmdMainTemplateDecorator(mainTemplate, name) {
	this.mainTemplate = mainTemplate;
	this.name = name;
}
module.exports = UmdMainTemplateDecorator;
UmdMainTemplateDecorator.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var source = this.mainTemplate.render(hash, chunk, moduleTemplate, dependencyTemplates);
	var prefix = "module.exports =\n";
	return new ConcatSource(new OriginalSource(
		"(function webpackUniversalModuleDefinition(root) {\n" +
		"	return function webpackUniversalModuleDefinitionWrapBootstrap(fn) {\n" +
		"		return function webpackUniversalModuleDefinitionBootstrap(modules) {\n" +
		"			if(typeof exports === 'object' && typeof module === 'object')\n" +
		"				module.exports = fn(modules);\n" +
		"			else if(typeof define === 'function' && define.amd)\n" +
		"				define(function() { return fn(modules); });\n" +
		"			else if(typeof exports === 'object')\n" +
		"				exports[" + JSON.stringify(this.name) + "] = fn(modules);\n" +
		"			else\n" +
		"				root[" + JSON.stringify(this.name) + "] = fn(modules);\n" +
		"		}\n" +
		"	}\n" +
		"})(this)\n", "webpackUniversalModuleDefinition"), source);
};
UmdMainTemplateDecorator.prototype.updateHash = function(hash) {
	hash.update("umd");
	hash.update(this.name);
	this.mainTemplate.updateHash(hash);
};