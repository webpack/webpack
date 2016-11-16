/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require('path');
var AliasPlugin = require("enhanced-resolve/lib/AliasPlugin");
var objectAssign = require('object-assign');
var ModuleParserHelpers = require("../ModuleParserHelpers");
var nodeLibsBrowser = require("node-libs-browser");

function NodeSourcePlugin(options) {
	this.options = options;
}
module.exports = NodeSourcePlugin;
NodeSourcePlugin.prototype.apply = function(compiler) {
	var options = this.options;

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

	function buildExpression(context, pathToModule) {
		var moduleJsPath = path.relative(context, pathToModule);
		if(!/^[A-Z]:/i.test(moduleJsPath)) {
			moduleJsPath = "./" + moduleJsPath.replace(/\\/g, "/");
		}
		return "require(" + JSON.stringify(moduleJsPath) + ")";
	}

	compiler.plugin("compilation", function(compilation, params) {
		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {

			if(parserOptions.node === false)
				return;

			var localOptions = options;
			if(parserOptions.node)
				localOptions = objectAssign({}, localOptions, parserOptions.node);

			if(localOptions.process) {
				var processType = localOptions.process;
				parser.plugin("expression process", function() {
					return ModuleParserHelpers.addParsedVariable(this, "process", buildExpression(this.state.module.context, getPathToModule("process", processType)));
				});
			}
			if(localOptions.global) {
				parser.plugin("expression global", function() {
					return ModuleParserHelpers.addParsedVariable(this, "global", buildExpression(this.state.module.context, require.resolve("../../buildin/global.js")));
				});
			}
			if(localOptions.console) {
				var consoleType = localOptions.console;
				parser.plugin("expression console", function() {
					return ModuleParserHelpers.addParsedVariable(this, "console", buildExpression(this.state.module.context, getPathToModule("console", consoleType)));
				});
			}
			var bufferType = localOptions.Buffer;
			if(bufferType) {
				parser.plugin("expression Buffer", function() {
					return ModuleParserHelpers.addParsedVariable(this, "Buffer", buildExpression(this.state.module.context, getPathToModule("buffer", bufferType)) + ".Buffer");
				});
			}
			if(localOptions.setImmediate) {
				var setImmediateType = localOptions.setImmediate;
				parser.plugin("expression setImmediate", function() {
					return ModuleParserHelpers.addParsedVariable(this, "setImmediate", buildExpression(this.state.module.context, getPathToModule("timers", setImmediateType)) + ".setImmediate");
				});
				parser.plugin("expression clearImmediate", function() {
					return ModuleParserHelpers.addParsedVariable(this, "clearImmediate", buildExpression(this.state.module.context, getPathToModule("timers", setImmediateType)) + ".clearImmediate");
				});
			}
		});
	});
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
