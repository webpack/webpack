/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AliasPlugin = require("enhanced-resolve/lib/AliasPlugin");
const nodeLibsBrowser = require("node-libs-browser");
const { getModulePath } = require("../JavascriptParserHelpers");
const ProvidedDependency = require("../dependencies/ProvidedDependency");

module.exports = class NodeSourcePlugin {
	constructor(options) {
		this.options = options;
	}
	apply(compiler) {
		const options = this.options;
		if (options === false) {
			// allow single kill switch to turn off this plugin
			return;
		}

		const getPathToModule = (module, type) => {
			if (type === true || (type === undefined && nodeLibsBrowser[module])) {
				if (!nodeLibsBrowser[module]) {
					throw new Error(
						`No browser version for node.js core module ${module} available`
					);
				}
				return nodeLibsBrowser[module];
			} else if (type === "mock") {
				return require.resolve(`node-libs-browser/mock/${module}`);
			} else if (type === "empty") {
				return require.resolve("node-libs-browser/mock/empty");
			} else {
				return module;
			}
		};

		const addExpression = (parser, module, identifier, specifier, type) => {
			parser.hooks.expression.for(identifier).tap("NodeSourcePlugin", expr => {
				if (
					parser.state.module &&
					parser.state.module.resource === getPathToModule(module, type)
				) {
					return;
				}
				const dep = new ProvidedDependency(
					getModulePath(
						parser.state.module.context,
						getPathToModule(module, type)
					),
					identifier,
					specifier ? [specifier] : null,
					expr.range
				);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
			});
		};

		compiler.hooks.compilation.tap(
			"NodeSourcePlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ProvidedDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ProvidedDependency,
					new ProvidedDependency.Template()
				);

				const handler = (parser, parserOptions) => {
					if (parserOptions.node === false) return;

					let localOptions = options;
					if (parserOptions.node) {
						localOptions = Object.assign({}, localOptions, parserOptions.node);
					}
					if (localOptions.global) {
						parser.hooks.expression
							.for("global")
							.tap("NodeSourcePlugin", expr => {
								const dep = new ProvidedDependency(
									getModulePath(
										parser.state.module.context,
										require.resolve("../../buildin/global")
									),
									"global",
									null,
									expr.range
								);
								dep.loc = expr.loc;
								parser.state.module.addDependency(dep);
							});
					}
					if (localOptions.process) {
						const processType = localOptions.process;
						addExpression(parser, "process", "process", null, processType);
					}
					if (localOptions.console) {
						const consoleType = localOptions.console;
						addExpression(parser, "console", "console", null, consoleType);
					}
					const bufferType = localOptions.Buffer;
					if (bufferType) {
						addExpression(parser, "buffer", "Buffer", "Buffer", bufferType);
					}
					if (localOptions.setImmediate) {
						const setImmediateType = localOptions.setImmediate;
						addExpression(
							parser,
							"timers",
							"setImmediate",
							"setImmediate",
							setImmediateType
						);
						addExpression(
							parser,
							"timers",
							"clearImmediate",
							"clearImmediate",
							setImmediateType
						);
					}
				};
				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("NodeSourcePlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("NodeSourcePlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("NodeSourcePlugin", handler);
			}
		);
		compiler.hooks.afterResolvers.tap("NodeSourcePlugin", compiler => {
			for (const lib of Object.keys(nodeLibsBrowser)) {
				if (options[lib] !== false) {
					compiler.resolverFactory.hooks.resolver
						.for("normal")
						.tap("NodeSourcePlugin", resolver => {
							new AliasPlugin(
								"described-resolve",
								{
									name: lib,
									onlyModule: true,
									alias: getPathToModule(lib, options[lib])
								},
								"resolve"
							).apply(resolver);
						});
				}
			}
		});
	}
};
