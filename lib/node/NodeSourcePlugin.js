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
	if(this.options.process == "mock") {
		compiler.parser.plugin("expression process", function(expr) {
			return ModuleParserHelpers.addParsedVariable(this, "process", "require(" + JSON.stringify(require.resolve("node-libs-browser/mock/_process")) + ")");
		});
	} else if(this.options.process) {
		compiler.parser.plugin("expression process", function(expr) {
			return ModuleParserHelpers.addParsedVariable(this, "process", "require(" + JSON.stringify(nodeLibsBrowser._process) + ")");
		});
	}
	if(this.options.global) {
		compiler.parser.plugin("expression global", function(expr) {
			this.state.current.addVariable("global", "this");
			return true;
		});
	}
	if(this.options.console == "mock") {
		compiler.parser.plugin("expression console", function(expr) {
			return ModuleParserHelpers.addParsedVariable(this, "console", "require(" + JSON.stringify(require.resolve("node-libs-browser/mock/_console")) + ")");
		});
	} else if(this.options.console) {
		compiler.parser.plugin("expression console", function(expr) {
			return ModuleParserHelpers.addParsedVariable(this, "console", "require(" + JSON.stringify(require("node-libs-browser")._console) + ")");
		});
	}
	if(this.options.buffer == "mock") {
		compiler.parser.plugin("expression Buffer", function(expr) {
			return ModuleParserHelpers.addParsedVariable(this, "Buffer", "require(" + JSON.stringify(require.resolve("node-libs-browser/mock/buffer")) + ").Buffer");
		});
	} else if(this.options.buffer) {
		compiler.parser.plugin("expression Buffer", function(expr) {
			return ModuleParserHelpers.addParsedVariable(this, "Buffer", "require(" + JSON.stringify(require("node-libs-browser").buffer) + ").Buffer");
		});
	}
	var options = this.options;
	compiler.plugin("after-resolvers", function(compiler) {
		var alias = {};
		Object.keys(nodeLibsBrowser).forEach(function(lib) {
			if(/^_/.test(lib)) return;
			if(options[lib] === "mock")
				alias[lib] = require.resolve("node-libs-browser/mock/" + lib);
			else if(options[lib] || options[lib] === undefined)
				alias[lib] = require("node-libs-browser")[lib];
		});
		if(Object.keys(alias).length > 0) {
			compiler.resolvers.normal.apply(
				new ModuleAliasPlugin(alias)
			);
		}
	});
};