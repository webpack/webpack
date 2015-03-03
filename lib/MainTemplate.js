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
	this.plugin("startup", function(source, chunk, hash) {
		var buf = [];
		if(chunk.modules.some(function(m) { return m.id === 0; })) {
			buf.push("");
			buf.push("// Load entry module and return exports");
			buf.push("return " + this.renderRequireFunctionForModule(hash, chunk, "0") + "(0);");
		}
		return this.asString(buf);
	});
	this.plugin("render", function(bootstrapSource, chunk, hash, moduleTemplate, dependencyTemplates) {
		var source = new ConcatSource();
		source.add("/******/ (function(modules) { // webpackBootstrap\n");
		source.add(new PrefixSource("/******/", bootstrapSource));
		source.add("\n/******/ })\n");
		source.add("/************************************************************************/\n");
		source.add("/******/ (");
		var modules = this.renderChunkModules(chunk, moduleTemplate, dependencyTemplates, "/******/ ");
		source.add(this.applyPluginsWaterfall("modules", modules, chunk, hash, moduleTemplate, dependencyTemplates));
		source.add(")");
		return source;
	});
	this.plugin("local-vars", function(source, chunk, hash) {
		return this.asString([
			source,
			"// The module cache",
			"var installedModules = {};"
		]);
	});
	this.plugin("require", function(source, chunk, hash) {
		return this.asString([
			source,
			"// Check if module is in cache",
			"if(installedModules[moduleId])",
			this.indent("return installedModules[moduleId].exports;"),
			"",
			"// Create a new module (and put it into the cache)",
			"var module = installedModules[moduleId] = {",
			this.indent(this.applyPluginsWaterfall("module-obj", "", chunk, hash, "moduleId")),
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
		]);
	});
	this.plugin("module-obj", function(source, chunk, hash, varModuleId) {
		return this.asString([
			"exports: {},",
			"id: moduleId,",
			"loaded: false"
		]);
	});
	this.plugin("require-extensions", function(source, chunk, hash) {
		var buf = [];
		if(chunk.chunks.length > 0) {
			buf.push("// This file contains only the entry chunk.");
			buf.push("// The chunk loading function for additional chunks");
			buf.push(this.requireFn + ".e = function requireEnsure(chunkId, callback) {");
			buf.push(this.indent(this.applyPluginsWaterfall("require-ensure", "throw new Error('Not chunk loading available');", chunk, hash, "chunkId")));
			buf.push("};");
		}
		buf.push("");
		buf.push("// expose the modules object (__webpack_modules__)");
		buf.push(this.requireFn + ".m = modules;");

		buf.push("");
		buf.push("// expose the module cache");
		buf.push(this.requireFn + ".c = installedModules;");

		var publicPath = this.outputOptions.publicPath || "";
		publicPath = this.applyPluginsWaterfall("asset-path", publicPath, {
			hash: hash
		});
		buf.push("");
		buf.push("// __webpack_public_path__");
		buf.push(this.requireFn + ".p = " + JSON.stringify(publicPath) + ";");
		return this.asString(buf);
	});
}
module.exports = MainTemplate;

MainTemplate.prototype = Object.create(Template.prototype);
MainTemplate.prototype.requireFn = "__webpack_require__";
MainTemplate.prototype.render = function(hash, chunk, moduleTemplate, dependencyTemplates) {
	var buf = [];
	buf.push(this.applyPluginsWaterfall("bootstrap", "", chunk, hash, moduleTemplate, dependencyTemplates));
	buf.push(this.applyPluginsWaterfall("local-vars", "", chunk, hash));
	buf.push("");
	buf.push("// The require function");
	buf.push("function " + this.requireFn + "(moduleId) {");
	buf.push(this.indent(this.applyPluginsWaterfall("require", "", chunk, hash)));
	buf.push("}");
	buf.push("");
	buf.push(this.asString(this.applyPluginsWaterfall("require-extensions", "", chunk, hash)));
	buf.push(this.asString(this.applyPluginsWaterfall("startup", "", chunk, hash)));
	var source = this.applyPluginsWaterfall("render", new OriginalSource(this.prefix(buf, " \t"), "webpack/bootstrap " + hash), chunk, hash, moduleTemplate, dependencyTemplates);
	if(chunk.modules.some(function(module) {
		return (module.id === 0);
	})) {
		source = this.applyPluginsWaterfall("render-with-entry", source, chunk, hash);
	}
	if(!source) throw new Error("Compiler error: MainTemplate plugin 'render' should return something");
	chunk.rendered = true;
	return new ConcatSource(source, ";");
};

MainTemplate.prototype.renderRequireFunctionForModule = function(hash, chunk, varModuleId) {
	return this.applyPluginsWaterfall("module-require", this.requireFn, chunk, hash, varModuleId);
};

MainTemplate.prototype.renderAddModule = function(hash, chunk, varModuleId, varModule) {
	return this.applyPluginsWaterfall("add-module", "modules[" + varModuleId + "] = " + varModule + ";", chunk, hash, varModuleId, varModule);
};

MainTemplate.prototype.renderCurrentHashCode = function(hash, length) {
	length = length || Infinity;
	return this.applyPluginsWaterfall("current-hash", JSON.stringify(hash.substr(0, length)), length);
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
	hash.update("3");
	hash.update(this.outputOptions.publicPath + "");
	this.applyPlugins("hash", hash);
};

MainTemplate.prototype.useChunkHash = function(chunk) {
	var paths = this.applyPluginsWaterfall("global-hash-paths", []);
	return !this.applyPluginsBailResult("global-hash", chunk, paths);
};
