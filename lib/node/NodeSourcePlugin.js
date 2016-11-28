/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleAliasPlugin = require("enhanced-resolve/lib/ModuleAliasPlugin");
var ModuleParserHelpers = require("../ModuleParserHelpers");
var nodeLibsBrowser = require("node-libs-browser");
var path = require("path");

function NodeSourcePlugin(options) {
	this.options = options;
}
module.exports = NodeSourcePlugin;
NodeSourcePlugin.prototype.apply = function(compiler) {
	var parser = compiler.parser;

	function buildExpression(context, pathToModule) {
		var moduleJsPath = path.relative(context, pathToModule);
		if(!/^[A-Z]:/i.test(moduleJsPath)) {
			moduleJsPath = "./" + moduleJsPath.replace(/\\/g, "/");
		}
		return "require(" + JSON.stringify(moduleJsPath) + ")";
	}

	function addExpression(parser, name, module, type, suffix) {
		suffix = suffix || "";
		parser.plugin("expression " + name, function() {
			if(this.state.module && this.state.module.resource === getPathToModule(module, type)) return;
			return ModuleParserHelpers.addParsedVariable(this, name, buildExpression(this.state.module.context, getPathToModule(module, type)) + suffix);
		});
	}

	function getPathToModule(module, type) {
		if(type === true || (type === undefined && nodeLibsBrowser[module])) {
			if(!nodeLibsBrowser[module]) throw new Error("No browser version for node.js core module '" + module + "' available");
			return nodeLibsBrowser[module];
		} else if(type === "mock") {
			return require.resolve("node-libs-browser/mock/" + module);
		} else if(type === "empty") {
			return require.resolve("node-libs-browser/mock/empty");
		} else return module;
	}

	if(this.options.global) {
		compiler.parser.plugin("expression global", function() {
			this.state.module.addVariable("global", "(function() { return this; }())");
			return true;
		});
	}
	if(this.options.process) {
		var processType = this.options.process;
		addExpression(parser, "process", "process", processType);
	}
	if(this.options.console) {
		var consoleType = this.options.console;
		addExpression(parser, "console", "console", consoleType);
	}
	var bufferType = this.options.Buffer;
	if(typeof bufferType === "undefined") {
		bufferType = this.options.buffer;
		if(typeof bufferType === "undefined")
			bufferType = true;
	}
	if(bufferType) {
		addExpression(parser, "Buffer", "buffer", bufferType, ".Buffer");
	}
	if(this.options.setImmediate) {
		var setImmediateType = this.options.setImmediate;
		addExpression(parser, "setImmediate", "timers", setImmediateType, ".setImmediate");
		addExpression(parser, "clearImmediate", "timers", setImmediateType, ".clearImmediate");
	}
	var options = this.options;
	compiler.plugin("after-resolvers", function(compiler) {
		var alias = {};
		Object.keys(nodeLibsBrowser).forEach(function(lib) {
			if(options[lib] !== false)
				alias[lib + "$"] = getPathToModule(lib, options[lib]);
		});
		if(Object.keys(alias).length > 0) {
			compiler.resolvers.normal.apply(
				new ModuleAliasPlugin(alias)
			);
		}
	});
};
