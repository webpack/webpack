/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var OriginalSource = require("webpack-core/lib/OriginalSource");
var Template = require("./Template");

function accessorToObjectAccess(accessor) {
	return accessor.map(function(a) {
		return "[" + JSON.stringify(a) + "]";
	}).join("");
}

function accessorAccess(base, accessor) {
	accessor = [].concat(accessor);
	return accessor.map(function(a, idx) {
		a = base + accessorToObjectAccess(accessor.slice(0, idx+1));
		if(idx === accessor.length - 1) return a;
		return a + " = " + a + " || {}";
	}).join(", ");
}

function UmdMainTemplateDecorator(mainTemplate, name) {
	this.mainTemplate = mainTemplate;
	this.name = name;
}
module.exports = UmdMainTemplateDecorator;
UmdMainTemplateDecorator.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var source = this.mainTemplate.render(hash, chunk, moduleTemplate, dependencyTemplates);
	var externals = chunk.modules.filter(function(m) {
		return m.external;
	});
	function replaceKeys(str) {
		return (str
			.replace(Template.REGEXP_HASH, hash)
			.replace(Template.REGEXP_CHUNKHASH, chunk.renderedHash)
			.replace(Template.REGEXP_ID, chunk.id)
			.replace(Template.REGEXP_NAME, chunk.name || ""));
	}
	function externalsDepsArray() {
		return "[" + replaceKeys(externals.map(function(m) {
			return JSON.stringify(typeof m.request === "object" ? m.request.amd : m.request);
		}).join(", ")) + "]";
	}
	function externalsRootArray() {
		return replaceKeys(externals.map(function(m) {
			var request = m.request;
			if(typeof request === "object") request = request.root;
			return "root" + accessorToObjectAccess([].concat(request));
		}).join(", "));
	}
	function externalsRequireArray(type) {
		return replaceKeys(externals.map(function(m) {
			var request = m.request;
			if(typeof request === "object") request = request[type];
			if(Array.isArray(request)) {
				return "require(" + JSON.stringify(request[0]) + ")" + accessorToObjectAccess(request.slice(1));
			} else 
				return "require(" + JSON.stringify(request) + ")";
		}).join(", "));
	}
	var externalsArguments = externals.map(function(m) {
		return "__WEBPACK_EXTERNAL_MODULE_" + m.id + "__";
	}).join(", ");
	return new ConcatSource(new OriginalSource(
		"(function webpackUniversalModuleDefinition(root, factory) {\n" +
		"	if(typeof exports === 'object' && typeof module === 'object')\n" +
		"		module.exports = factory(" + externalsRequireArray("commonjs2") + ");\n" +
		"	else if(typeof define === 'function' && define.amd)\n" +
		(externalsArguments ?
		"		define(" + externalsDepsArray() + ", factory);\n"
		:
		"		define(factory);\n"
		) +
		(this.name ?
		"	else if(typeof exports === 'object')\n" +
		"		exports[" + JSON.stringify(replaceKeys([].concat(this.name).pop())) + "] = factory(" + externalsRequireArray("commonjs") + ");\n" +
		"	else\n" +
		"		" + replaceKeys(accessorAccess("root", this.name)) + " = factory(" + externalsRootArray() + ");\n"
		:
		"	else {\n" +
		(externalsArguments ?
		"		var a = typeof exports === 'object' ? factory(" + externalsRequireArray("commonjs") + ") : factory(" + externalsRootArray() + ");\n"
		:
		"		var a = factory();\n"
		) +
		"		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];\n" +
		"	}\n"
		) +
		"})(this, function(" + externalsArguments + ") {\nreturn ", "webpack/universalModuleDefinition"), source, "\n})\n");
};

UmdMainTemplateDecorator.prototype.useChunkHash = function(chunk) {
	if(!this.mainTemplate.useChunkHash || !this.mainTemplate.useChunkHash(chunk)) return false;
	return !Template.REGEXP_HASH.test([].concat(this.name || "").join("|"));
};

UmdMainTemplateDecorator.prototype.updateHash = function(hash) {
	hash.update("umd");
	hash.update(this.name + "");
	this.mainTemplate.updateHash(hash);
};
