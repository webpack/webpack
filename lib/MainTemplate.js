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
MainTemplate.prototype.requireFn = "__webpack_require__";
MainTemplate.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var buf = [];
	buf.push(this.asString(this.renderAdditions(hash, chunk, moduleTemplate, dependencyTemplates)));
	buf.push(this.asString(this.renderLocalVars(hash, chunk)));
	buf.push("");
	buf.push("// The require function");
	buf.push("function " + this.requireFn + "(moduleId) {");
	buf.push(this.indent(this.renderRequireContent(hash, chunk)));
	buf.push("}");
	buf.push("");
	buf.push(this.asString(this.renderRequireExtensions(hash, chunk)));
	buf.push(this.asString(this.renderInit(hash, chunk)));
	if(chunk.modules.some(function(m) { return m.id === 0; })) {
		buf.push("");
		buf.push("// Load entry module and return exports");
		buf.push("return " + this.renderRequireFunctionForModule(hash, chunk, "0") + "(0);");
	}
	var source = new ConcatSource();
	source.add("/******/ (function(modules) { // webpackBootstrap\n");
	source.add(new PrefixSource("/******/ \t", new OriginalSource(this.asString(buf), "webpack/bootstrap " + hash)));
	source.add("\n/******/ })\n");
	source.add("/************************************************************************/\n");
	source.add("/******/ (");
	source.add(this.renderModules(hash, chunk, moduleTemplate, dependencyTemplates));
	source.add(")");
	chunk.rendered = true;
	return source;
};

MainTemplate.prototype.renderModules = function renderModules(hash, chunk, moduleTemplate, dependencyTemplates) {
	return this.renderChunkModules(chunk, moduleTemplate, dependencyTemplates, "/******/ ");
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
		"modules[moduleId].call(module.exports, module, module.exports, " + this.renderRequireFunctionForModule(hash, chunk, "moduleId") + ");",
		"",
		"// Flag the module as loaded",
		"module.loaded = true;",
		"",
		"// Return the exports of the module",
		"return module.exports;"
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
	if(chunk.chunks.length > 0) {
		buf.push("// This file contains only the entry chunk.");
		buf.push("// The chunk loading function for additional chunks");
		buf.push(this.requireFn + ".e = function requireEnsure(chunkId, callback) {");
		buf.push(this.indent(this.renderRequireEnsure(hash, chunk)));
		buf.push("};");
	}
	buf.push("");
	buf.push("// expose the modules object (__webpack_modules__)");
	buf.push(this.requireFn + ".m = modules;");

	buf.push("");
	buf.push("// expose the module cache");
	buf.push(this.requireFn + ".c = installedModules;");

	var publicPath = this.outputOptions.publicPath || "";
	publicPath = publicPath.replace(Template.REGEXP_HASH, hash);
	buf.push("");
	buf.push("// __webpack_public_path__");
	buf.push(this.requireFn + ".p = " + JSON.stringify(publicPath) + ";");
	return buf;
};

MainTemplate.prototype.renderInit = function(hash, chunk) {
	return [];
};

MainTemplate.prototype.renderAdditions = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	return [];
};

MainTemplate.prototype.renderAddModule = function(hash, chunk, varModuleId, varModule) {
	return ["modules[" + varModuleId + "] = " + varModule + ";"];
};

MainTemplate.prototype.renderCurrentHashCode = function(hash) {
	return JSON.stringify(hash);
};

MainTemplate.prototype.entryPointInChildren = function(chunk) {
	return (function checkChildren(chunk, alreadyCheckedChunks) {
		return chunk.chunks.some(function(child) {
			if(alreadyCheckedChunks.indexOf(child) >= 0) return;
			alreadyCheckedChunks.push(child);
			return child.modules.some(function(module) {
				return (module.id === 0);
			}) || checkChildren(child, alreadyCheckedChunks);
		});
	}(chunk, []));
};

MainTemplate.prototype.updateHash = function(hash) {
	hash.update("maintemplate");
	hash.update("2");
	hash.update(this.outputOptions.publicPath + "");
};