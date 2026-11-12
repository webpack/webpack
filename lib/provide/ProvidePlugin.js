/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ConstDependency = require("../dependencies/core/ConstDependency");
const { approve } = require("../javascript/JavascriptParserHelpers");
const { Field } = require("../javascript/syntax").parser;
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const ProvidedDependency = require("./ProvidedDependency");

/** @import { JavascriptParserOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import JavascriptParser from "../javascript/JavascriptParser" */

const PLUGIN_NAME = "ProvidePlugin";

class ProvidePlugin {
	/**
	 * Creates an instance of ProvidePlugin.
	 * @param {Record<string, string | string[]>} definitions the provided identifiers
	 */
	constructor(definitions) {
		/** @type {Record<string, string | string[]>} */
		this.definitions = definitions;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const definitions = this.definitions;
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);
				compilation.dependencyFactories.set(
					ProvidedDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ProvidedDependency,
					new ProvidedDependency.Template()
				);
				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptParserOptions} parserOptions options
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					for (const name of Object.keys(definitions)) {
						const request = [
							...(Array.isArray(definitions[name])
								? definitions[name]
								: [definitions[name]])
						];
						const splittedName = name.split(".");
						if (splittedName.length > 0) {
							for (const [i, _] of splittedName.slice(1).entries()) {
								const name = splittedName.slice(0, i + 1).join(".");
								parser.hooks.canRename
									.for(name)
									.tap({ name: PLUGIN_NAME, path: true }, approve);
							}
						}

						parser.hooks.expression
							.for(name)
							.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
								const nameIdentifier = name.includes(".")
									? `__webpack_provided_${name.replace(/\./g, "_dot_")}`
									: name;
								const dep = new ProvidedDependency(
									request[0],
									nameIdentifier,
									request.slice(1),
									path.range(node)
								);
								dep.loc = parser.getLocation(parser.nodeOfPath(path, node));
								parser.state.module.addDependency(dep);
								return true;
							});

						parser.hooks.call
							.for(name)
							.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
								const callee = path.field(0, Field.callee, node);
								const nameIdentifier = name.includes(".")
									? `__webpack_provided_${name.replace(/\./g, "_dot_")}`
									: name;
								const dep = new ProvidedDependency(
									request[0],
									nameIdentifier,
									request.slice(1),
									path.range(callee)
								);
								dep.loc = parser.getLocation(parser.nodeOfPath(path, callee));
								parser.state.module.addDependency(dep);
								const count = path.fieldCount(Field.arguments, node);
								for (let i = 0; i < count; i++) {
									parser.walkExpression(
										parser.nodeOfPath(
											path,
											path.field(i, Field.arguments, node)
										)
									);
								}
								return true;
							});
					}
				};
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

module.exports = ProvidePlugin;
