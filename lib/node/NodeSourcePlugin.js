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

	function addExpression(parser, name, module, type, suffix) {
		suffix = suffix || "";
		parser.plugin("expression " + name, function() {
			if(this.state.module && this.state.module.resource === getPathToModule(module, type)) return;
			return ModuleParserHelpers.addParsedVariable(this, name, buildExpression(this.state.module.context, getPathToModule(module, type)) + suffix);
		});
	}

	compiler.plugin("compilation", function(compilation, params) {
		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {

			if(parserOptions.node === false)
				return;

			var localOptions = options;
			if(parserOptions.node)
				localOptions = objectAssign({}, localOptions, parserOptions.node);

			if(localOptions.global) {
				parser.plugin("expression global", function() {
					return ModuleParserHelpers.addParsedVariable(this, "global", buildExpression(this.state.module.context, require.resolve("../../buildin/global.js")));
				});
			}
			if(localOptions.process) {
				var processType = localOptions.process;
				addExpression(parser, "process", "process", processType);
			}
			if(localOptions.console) {
				var consoleType = localOptions.console;
				addExpression(parser, "console", "console", consoleType);
			}
			var bufferType = localOptions.Buffer;
			if(bufferType) {
				addExpression(parser, "Buffer", "buffer", bufferType, ".Buffer");
			}
			if(localOptions.setImmediate) {
				var setImmediateType = localOptions.setImmediate;
				addExpression(parser, "setImmediate", "timers", setImmediateType, ".setImmediate");
				addExpression(parser, "clearImmediate", "timers", setImmediateType, ".clearImmediate");
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
