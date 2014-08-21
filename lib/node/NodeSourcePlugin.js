/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var ModuleAliasPlugin = require("enhanced-resolve/lib/ModuleAliasPlugin");
var ModuleParserHelpers = require("../ModuleParserHelpers");
var ConstDependency = require("../dependencies/ConstDependency");
var nodeLibsBrowser = require("node-libs-browser");

function NodeSourcePlugin(options) {
	this.options = options;
}
module.exports = NodeSourcePlugin;
NodeSourcePlugin.prototype.apply = function(compiler) {
	function ignore() { return true; }
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
	if(this.options.process) {
		var processType = this.options.process;
		compiler.parser.plugin("expression process", function(expr) {
			return ModuleParserHelpers.addParsedVariable(this, "process", "require(" + JSON.stringify(getPathToModule("process", processType)) + ")");
		});
	}
	if(this.options.global) {
		compiler.parser.plugin("expression global", function(expr) {
			this.state.module.addVariable("global", "(function() { return this; }())");
			return true;
		});
	}
	if(this.options.console) {
		var consoleType = this.options.console;
		compiler.parser.plugin("expression console", function(expr) {
			return ModuleParserHelpers.addParsedVariable(this, "console", "require(" + JSON.stringify(getPathToModule("console", consoleType)) + ")");
		});
	}
	if(this.options.buffer) {
		var bufferType = this.options.buffer;
		compiler.parser.plugin("expression Buffer", function(expr) {
			return ModuleParserHelpers.addParsedVariable(this, "Buffer", "require(" + JSON.stringify(getPathToModule("buffer", bufferType)) + ").Buffer");
		});
	}
	var options = this.options;
	compiler.plugin("after-resolvers", function(compiler) {
		var alias = {};
		Object.keys(nodeLibsBrowser).forEach(function(lib) {
			if(options[lib] !== false)
				alias[lib] = getPathToModule(lib, options[lib]);
		});
		if(Object.keys(alias).length > 0) {
			compiler.resolvers.normal.apply(
				new ModuleAliasPlugin(alias)
			);
		}
	});
};