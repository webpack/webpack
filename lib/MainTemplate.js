/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var OriginalSource = require("webpack-core/lib/OriginalSource");
var PrefixSource = require("webpack-core/lib/PrefixSource");
var Template = require("./Template");

function MainTemplate(outputOptions) {
	Template.call(this, outputOptions);
}
module.exports = MainTemplate;

MainTemplate.prototype = Object.create(Template.prototype);
MainTemplate.prototype.requireFn = "require";
MainTemplate.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var buf = [];
	buf.push(this.asString(this.renderLocalVars(hash, chunk)));
	buf.push("");
	buf.push("// The require function");
	buf.push("function " + this.requireFn + "(moduleId) {");
	buf.push(this.indent(this.renderRequireContent(hash, chunk)));
	buf.push("}");
	buf.push("");
	buf.push(this.asString(this.renderRequireExtensions(hash, chunk)));
	buf.push(this.asString(this.renderInit(hash, chunk)));
	buf.push("");
	buf.push("// Load entry module and return exports");
	buf.push("return " + this.renderRequireFunctionForModule(hash, chunk, "0") + "(0);");
	var source = new ConcatSource();
	source.add("/******/ (function(modules) { // webpackBootstrap\n");
	source.add(new PrefixSource("/******/ \t", new OriginalSource(this.asString(buf), "webpackBootstrap " + hash)));
	source.add("\n/******/ })\n");
	source.add("/************************************************************************/\n");
	source.add("/******/ (");
	source.add(this.renderModules(hash, chunk, moduleTemplate, dependencyTemplates));
	source.add(")");
	chunk.rendered = true;
	return source;
};

MainTemplate.prototype.renderModules = function renderModules(hash, chunk, moduleTemplate, dependencyTemplates) {
	var source = new ConcatSource();
	source.add("{\n");
	source.add(this.asString(this.renderInitModules(hash, chunk, moduleTemplate, dependencyTemplates)));
	source.add("\n");
	chunk.modules.forEach(function(module, idx) {
		if(idx != 0) source.add(",\n");
		source.add("\n/***/ " + module.id + ":\n");
		source.add(moduleTemplate.render(module, dependencyTemplates, chunk));
	});
	source.add("\n/******/ }");
	return source;
};

MainTemplate.prototype.indent = function indent(str) {
	if(Array.isArray(str)) {
		return str.map(indent).join("\n");
	} else {
		return "\t" + str.trimRight().replace(/\n/g, "\n\t");
	}
};

MainTemplate.prototype.prefix = function(str, prefix) {
	if(Array.isArray(str)) {
		str = str.join("\n");
	}
	return prefix + str.trim().replace(/\n/g, "\n" + prefix);
};

MainTemplate.prototype.asString = function(str) {
	if(Array.isArray(str)) {
		return str.join("\n");
	}
	return str;
};

MainTemplate.prototype.renderLocalVars = function(hash, chunk) {
	return [
		"// The module cache",
		"var installedModules = {};"
	];
};

MainTemplate.prototype.renderRequireContent = function(hash, chunk) {
	return [
		"// Check if module is in cache",
		"if(installedModules[moduleId])",
		this.indent("return installedModules[moduleId].exports;"),
		"",
		"// Create a new module (and put it into the cache)",
		"var module = installedModules[moduleId] = {",
		this.indent(this.renderModule(hash, chunk, "moduleId")),
		"};",
		"",
		"// Execute the module function",
		"modules[moduleId].call(null, module, module.exports, " + this.renderRequireFunctionForModule(hash, chunk, "moduleId") + ");",
		"",
		"// Flag the module as loaded",
		"module.loaded = true;",
		"",
		"// Return the exports of the module",
		"return module.exports;",
	];
};

MainTemplate.prototype.renderRequireFunctionForModule = function(hash, chunk, varModuleId) {
	return this.requireFn;
};

MainTemplate.prototype.renderModule = function(hash, chunk, varModuleId) {
	return [
		"exports: {},",
		"id: moduleId,",
		"loaded: false"
	];
};

MainTemplate.prototype.renderRequireExtensions = function(hash, chunk) {
	var buf = [];
	if(chunk.chunks.length == 0) {
		buf.push("// The bundle contains no chunks. A empty chunk loading function.");
		buf.push(this.requireFn + ".e = function requireEnsure(_, callback) {");
		buf.push(this.indent([
			"callback.call(null, require);"
		]));
		buf.push("};");
	} else {
		buf.push("// This file contains only the entry chunk.");
		buf.push("// The chunk loading function for additional chunks");
		buf.push(this.requireFn + ".e = function requireEnsure(chunkId, callback) {");
		buf.push(this.indent(this.renderRequireEnsure(hash, chunk)));
		buf.push("};");
	}
	buf.push("");
	buf.push("// expose the modules object (__webpack_modules__)");
	buf.push(this.requireFn + ".modules = modules;");
	buf.push("");
	buf.push("// expose the module cache");
	buf.push(this.requireFn + ".cache = installedModules;");
	return buf;
};

MainTemplate.prototype.renderInit = function(hash, chunk) {
	return [];
};

MainTemplate.prototype.renderInitModules = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var publicPath = this.outputOptions.publicPath || "";
	return [
		"/******/ // __webpack_public_path__",
		"/******/ c: " + JSON.stringify(publicPath.replace(Template.REGEXP_HASH, hash)) + ","
	];
};

MainTemplate.prototype.renderAddModule = function(hash, chunk, varModuleId, varModule) {
	return ["modules[" + varModuleId + "] = " + varModule + ";"]
}

MainTemplate.prototype.updateHash = function(hash) {
	hash.update("maintemplate");
	hash.update("1");
	hash.update(this.outputOptions.publicPath + "");
};