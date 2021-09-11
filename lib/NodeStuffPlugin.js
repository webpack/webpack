/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NodeStuffInWebError = require("./NodeStuffInWebError");
const RuntimeGlobals = require("./RuntimeGlobals");
const CachedConstDependency = require("./dependencies/CachedConstDependency");
const ConstDependency = require("./dependencies/ConstDependency");
const {
	evaluateToString,
	expressionIsUnsupported
} = require("./javascript/JavascriptParserHelpers");
const { relative } = require("./util/fs");
const { parseResource } = require("./util/identifier");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */

class NodeStuffPlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap(
			"NodeStuffPlugin",
			(compilation, { normalModuleFactory }) => {
				const handler = (parser, parserOptions) => {
					if (parserOptions.node === false) return;

					let localOptions = options;
					if (parserOptions.node) {
						localOptions = { ...localOptions, ...parserOptions.node };
					}

					if (localOptions.global !== false) {
						const withWarning = localOptions.global === "warn";
						parser.hooks.expression
							.for("global")
							.tap("NodeStuffPlugin", expr => {
								const dep = new ConstDependency(
									RuntimeGlobals.global,
									expr.range,
									[RuntimeGlobals.global]
								);
								dep.loc = expr.loc;
								parser.state.module.addPresentationalDependency(dep);

								// TODO webpack 6 remove
								if (withWarning) {
									parser.state.module.addWarning(
										new NodeStuffInWebError(
											dep.loc,
											"global",
											"The global namespace object is Node.js feature and doesn't present in browser."
										)
									);
								}
							});
					}

					const setModuleConstant = (expressionName, fn, warning) => {
						parser.hooks.expression
							.for(expressionName)
							.tap("NodeStuffPlugin", expr => {
								const dep = new CachedConstDependency(
									JSON.stringify(fn(parser.state.module)),
									expr.range,
									expressionName
								);
								dep.loc = expr.loc;
								parser.state.module.addPresentationalDependency(dep);

								// TODO webpack 6 remove
								if (warning) {
									parser.state.module.addWarning(
										new NodeStuffInWebError(dep.loc, expressionName, warning)
									);
								}

								return true;
							});
					};

					const setConstant = (expressionName, value, warning) =>
						setModuleConstant(expressionName, () => value, warning);

					const context = compiler.context;
					if (localOptions.__filename) {
						switch (localOptions.__filename) {
							case "mock":
								setConstant("__filename", "/index.js");
								break;
							case "warn-mock":
								setConstant(
									"__filename",
									"/index.js",
									"The __filename is Node.js feature and doesn't present in browser."
								);
								break;
							case true:
								setModuleConstant("__filename", module =>
									relative(compiler.inputFileSystem, context, module.resource)
								);
								break;
						}

						parser.hooks.evaluateIdentifier
							.for("__filename")
							.tap("NodeStuffPlugin", expr => {
								if (!parser.state.module) return;
								const resource = parseResource(parser.state.module.resource);
								return evaluateToString(resource.path)(expr);
							});
					}
					if (localOptions.__dirname) {
						switch (localOptions.__dirname) {
							case "mock":
								setConstant("__dirname", "/");
								break;
							case "warn-mock":
								setConstant(
									"__dirname",
									"/",
									"The __dirname is Node.js feature and doesn't present in browser."
								);
								break;
							case true:
								setModuleConstant("__dirname", module =>
									relative(compiler.inputFileSystem, context, module.context)
								);
								break;
						}

						parser.hooks.evaluateIdentifier
							.for("__dirname")
							.tap("NodeStuffPlugin", expr => {
								if (!parser.state.module) return;
								return evaluateToString(parser.state.module.context)(expr);
							});
					}
					parser.hooks.expression
						.for("require.extensions")
						.tap(
							"NodeStuffPlugin",
							expressionIsUnsupported(
								parser,
								"require.extensions is not supported by webpack. Use a loader instead."
							)
						);
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("NodeStuffPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("NodeStuffPlugin", handler);
			}
		);
	}
}

module.exports = NodeStuffPlugin;
