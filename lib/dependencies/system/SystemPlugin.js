/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SystemImportDeprecationWarning = require("../../errors/SystemImportDeprecationWarning");
const {
	evaluateToStringByPath,
	expressionIsUnsupportedByPath,
	toConstantDependencyByPath
} = require("../../javascript/JavascriptParserHelpers");
const { Field } = require("../../javascript/syntax").parser;
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC
} = require("../../module/ModuleTypeConstants");
const RuntimeGlobals = require("../../runtime/RuntimeGlobals");
const SystemRuntimeModule = require("./SystemRuntimeModule");

/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../../declarations/WebpackOptions"
 */
/** @import Compiler from "../../Compiler" */
/** @import Parser, { ImportExpression } from "../../javascript/JavascriptParser" */
/** @import { EstreeSource, SyntaxTree } from "../../javascript/syntax-parser" */

const PLUGIN_NAME = "SystemPlugin";

class SystemPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.hooks.runtimeRequirementInModule
					.for(RuntimeGlobals.system)
					.tap(PLUGIN_NAME, (module, set) => {
						set.add(RuntimeGlobals.requireScope);
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.system)
					.tap(PLUGIN_NAME, (chunk, _set) => {
						compilation.addRuntimeModule(chunk, new SystemRuntimeModule());
					});

				/**
				 * Handles the hook callback for this code path.
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					if (parserOptions.system === undefined || !parserOptions.system) {
						return;
					}

					/**
					 * Sets not supported.
					 * @param {string} name name
					 */
					const setNotSupported = (name) => {
						parser.hooks.evaluateTypeof
							.for(name)
							.tap(
								{ name: PLUGIN_NAME, path: true },
								evaluateToStringByPath("undefined")
							);
						parser.hooks.expression
							.for(name)
							.tap(
								{ name: PLUGIN_NAME, path: true },
								expressionIsUnsupportedByPath(
									parser,
									`${name} is not supported by webpack.`
								)
							);
					};

					parser.hooks.typeof
						.for("System.import")
						.tap(
							{ name: PLUGIN_NAME, path: true },
							toConstantDependencyByPath(parser, JSON.stringify("function"))
						);
					parser.hooks.evaluateTypeof
						.for("System.import")
						.tap(
							{ name: PLUGIN_NAME, path: true },
							evaluateToStringByPath("function")
						);
					parser.hooks.typeof
						.for("System")
						.tap(
							{ name: PLUGIN_NAME, path: true },
							toConstantDependencyByPath(parser, JSON.stringify("object"))
						);
					parser.hooks.evaluateTypeof
						.for("System")
						.tap(
							{ name: PLUGIN_NAME, path: true },
							evaluateToStringByPath("object")
						);

					setNotSupported("System.set");
					setNotSupported("System.get");
					setNotSupported("System.register");

					parser.hooks.expression
						.for("System")
						.tap(
							{ name: PLUGIN_NAME, path: true },
							toConstantDependencyByPath(parser, RuntimeGlobals.system, [
								RuntimeGlobals.system
							])
						);

					// the call stands for an `import()` of its first argument, which a
					// tree walk writes as a node beside the call, made of its ids
					parser.hooks.call
						.for("System.import")
						.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
							parser.state.module.addWarning(
								new SystemImportDeprecationWarning(
									parser.getLocation(parser.nodeOfPath(path, node))
								)
							);
							/** @type {EstreeSource} */
							const importExpression = {
								type: "ImportExpression",
								start: path.start(node),
								end: path.end(node),
								source: path.field(0, Field.arguments, node),
								options: null
							};
							return parser.hooks.importCall.call(
								/** @type {ImportExpression} */ (
									parser.nodeOfPath(
										path,
										/** @type {SyntaxTree} */ (parser._tree).appendEstree(
											importExpression,
											""
										)
									)
								)
							);
						});
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

SystemPlugin.SystemImportDeprecationWarning = SystemImportDeprecationWarning;

module.exports = SystemPlugin;
