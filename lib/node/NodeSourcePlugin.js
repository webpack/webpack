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
		if(options === false) // allow single kill switch to turn off this plugin
			return;

		const getPathToModule = (module, type) => {
			if(type === true || (type === undefined && nodeLibsBrowser[module])) {
				if(!nodeLibsBrowser[module]) throw new Error(`No browser version for node.js core module ${module} available`);
				return nodeLibsBrowser[module];
			} else if(type === "mock") {
				return require.resolve(`node-libs-browser/mock/${module}`);
			} else if(type === "empty") {
				return require.resolve("node-libs-browser/mock/empty");
			} else return module;
		};

		const addExpression = (parser, name, module, type, suffix) => {
			suffix = suffix || "";
			parser.plugin(`expression ${name}`, () => {
				if(parser.state.module && parser.state.module.resource === getPathToModule(module, type)) return;
				const mockModule = ParserHelpers.requireFileAsExpression(parser.state.module.context, getPathToModule(module, type));
				return ParserHelpers.addParsedVariableToModule(parser, name, mockModule + suffix);
			});
		};

		compiler.plugin("compilation", (compilation, params) => {
			params.normalModuleFactory.plugin(["parser javascript/auto", "parser javascript/dynamic", "parser javascript/esm"], (parser, parserOptions) => {

				if(parserOptions.node === false)
					return;

				let localOptions = options;
				if(parserOptions.node)
					localOptions = Object.assign({}, localOptions, parserOptions.node);

				if(localOptions.global) {
					parser.plugin("expression global", () => {
						const retrieveGlobalModule = ParserHelpers.requireFileAsExpression(parser.state.module.context, require.resolve("../../buildin/global.js"));
						return ParserHelpers.addParsedVariableToModule(parser, "global", retrieveGlobalModule);
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
					compiler.resolverFactory.plugin("resolver normal", resolver => resolver.apply(
						new AliasPlugin("described-resolve", {
							name: lib,
							onlyModule: true,
							alias: getPathToModule(lib, options[lib])
						}, "resolve")
					));
				}
			});
		});
	}
};
