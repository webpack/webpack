/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CachedConstDependency = require("./dependencies/CachedConstDependency");
const {
	evaluateToString,
	expressionIsUnsupported
} = require("./javascript/JavascriptParserHelpers");
const { relative } = require("./util/fs");

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

					const setModuleConstant = (expressionName, fn) => {
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
								return true;
							});
					};

					const setConstant = (expressionName, value) =>
						setModuleConstant(expressionName, () => value);

					const context = compiler.context;
					if (localOptions.__filename) {
						if (localOptions.__filename === "mock") {
							setConstant("__filename", "/index.js");
						} else {
							setModuleConstant("__filename", module =>
								relative(compiler.inputFileSystem, context, module.resource)
							);
						}
						parser.hooks.evaluateIdentifier
							.for("__filename")
							.tap("NodeStuffPlugin", expr => {
								if (!parser.state.module) return;
								const resource = parser.state.module.resource;
								const i = resource.indexOf("?");
								return evaluateToString(
									i < 0 ? resource : resource.substr(0, i)
								)(expr);
							});
					}
					if (localOptions.__dirname) {
						if (localOptions.__dirname === "mock") {
							setConstant("__dirname", "/");
						} else {
							setModuleConstant("__dirname", module =>
								relative(compiler.inputFileSystem, context, module.context)
							);
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
