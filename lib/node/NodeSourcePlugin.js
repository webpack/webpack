/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AliasPlugin = require("enhanced-resolve/lib/AliasPlugin");
var ModuleParserHelpers = require("../ModuleParserHelpers");
var nodeLibsBrowser = require("node-libs-browser");

function NodeSourcePlugin(options) {
	this.options = options;
}
module.exports = NodeSourcePlugin;
NodeSourcePlugin.prototype.apply = function(compiler) {
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
		compiler.parser.plugin("expression process", function() {
			return ModuleParserHelpers.addParsedVariable(this, "process", "require(" + JSON.stringify(getPathToModule("process", processType)) + ")");
		});
	}
	if(this.options.global) {
		compiler.parser.plugin("expression global", function() {
			return ModuleParserHelpers.addParsedVariable(this, "global", "require(" + JSON.stringify(require.resolve("../../buildin/global.js")) + ")");
		});
	}
	if(this.options.console) {
		var consoleType = this.options.console;
		compiler.parser.plugin("expression console", function() {
			return ModuleParserHelpers.addParsedVariable(this, "console", "require(" + JSON.stringify(getPathToModule("console", consoleType)) + ")");
		});
	}
	var bufferType = this.options.Buffer;
	if(bufferType) {
		compiler.parser.plugin("expression Buffer", function() {
			return ModuleParserHelpers.addParsedVariable(this, "Buffer", "require(" + JSON.stringify(getPathToModule("buffer", bufferType)) + ").Buffer");
		});
	}
	if(this.options.setImmediate) {
		var setImmediateType = this.options.setImmediate;
		compiler.parser.plugin("expression setImmediate", function() {
			return ModuleParserHelpers.addParsedVariable(this, "setImmediate", "require(" + JSON.stringify(getPathToModule("timers", setImmediateType)) + ").setImmediate");
		});
		compiler.parser.plugin("expression clearImmediate", function() {
			return ModuleParserHelpers.addParsedVariable(this, "clearImmediate", "require(" + JSON.stringify(getPathToModule("timers", setImmediateType)) + ").clearImmediate");
		});
	}
	var options = this.options;
	compiler.plugin("after-resolvers", function(compiler) {
		var alias = {};
		Object.keys(nodeLibsBrowser).forEach(function(lib) {
			if(options[lib] !== false) {
				compiler.resolvers.normal.apply(
					new AliasPlugin("described-resolve", {
						name: lib,
						onlyModule: true,
						alias: getPathToModule(lib, options[lib])
					}, "resolve")
				);
			}
		});
	});
};
