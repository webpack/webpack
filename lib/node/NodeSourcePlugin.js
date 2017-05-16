/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const AliasPlugin = require("enhanced-resolve/lib/AliasPlugin");
const ParserHelpers = require("../ParserHelpers");
const nodeLibsBrowser = require("node-libs-browser");

module.exports = class NodeSourcePlugin {
	constructor(options) {
		this.options = options;
	}
	apply(compiler) {
		const options = this.options;

		function getPathToModule(module, type) {
			if(type === true || (type === undefined && nodeLibsBrowser[module])) {
				if(!nodeLibsBrowser[module]) throw new Error(`No browser version for node.js core module ${module} available`);
				return nodeLibsBrowser[module];
			} else if(type === "mock") {
				return require.resolve(`node-libs-browser/mock/${module}`);
			} else if(type === "empty") {
				return require.resolve("node-libs-browser/mock/empty");
			} else return module;
		}

		function addExpression(parser, name, module, type, suffix) {
			suffix = suffix || "";
			parser.plugin(`expression ${name}`, function() {
				if(this.state.module && this.state.module.resource === getPathToModule(module, type)) return;
				const mockModule = ParserHelpers.requireFileAsExpression(this.state.module.context, getPathToModule(module, type));
				return ParserHelpers.addParsedVariableToModule(this, name, mockModule + suffix);
			});
		}

		compiler.plugin("compilation", function(compilation, params) {
			params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {

				if(parserOptions.node === false)
					return;

				let localOptions = options;
				if(parserOptions.node)
					localOptions = Object.assign({}, localOptions, parserOptions.node);

				if(localOptions.global) {
					parser.plugin("expression global", function() {
						const retrieveGlobalModule = ParserHelpers.requireFileAsExpression(this.state.module.context, require.resolve("../../buildin/global.js"));
						return ParserHelpers.addParsedVariableToModule(this, "global", retrieveGlobalModule);
					});
				}
				if(localOptions.process) {
					const processType = localOptions.process;
					addExpression(parser, "process", "process", processType);
				}
				if(localOptions.console) {
					const consoleType = localOptions.console;
					addExpression(parser, "console", "console", consoleType);
				}
				const bufferType = localOptions.Buffer;
				if(bufferType) {
					addExpression(parser, "Buffer", "buffer", bufferType, ".Buffer");
				}
				if(localOptions.setImmediate) {
					const setImmediateType = localOptions.setImmediate;
					addExpression(parser, "setImmediate", "timers", setImmediateType, ".setImmediate");
					addExpression(parser, "clearImmediate", "timers", setImmediateType, ".clearImmediate");
				}
			});
		});
		compiler.plugin("after-resolvers", (compiler) => {
			Object.keys(nodeLibsBrowser).forEach((lib) => {
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
	}
};
