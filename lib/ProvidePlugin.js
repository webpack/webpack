/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("./ModuleTypeConstants");
const ConstDependency = require("./dependencies/ConstDependency");
const ProvidedDependency = require("./dependencies/ProvidedDependency");
const { approve } = require("./javascript/JavascriptParserHelpers");

/** @typedef {import("./Compiler")} Compiler */

const PLUGIN_NAME = "ProvidePlugin";

class ProvidePlugin {
	/**
	 * @param {Record<string, string | string[]>} definitions the provided identifiers
	 */
	constructor(definitions) {
		this.definitions = definitions;
	}

	/**
	 * Apply the plugin
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
				const handler = (parser, parserOptions) => {
					Object.keys(definitions).forEach(name => {
						const request = [].concat(definitions[name]);
						const splittedName = name.split(".");
						if (splittedName.length > 0) {
							splittedName.slice(1).forEach((_, i) => {
								const name = splittedName.slice(0, i + 1).join(".");
								parser.hooks.canRename.for(name).tap(PLUGIN_NAME, approve);
							});
						}

						parser.hooks.expression.for(name).tap(PLUGIN_NAME, expr => {
							const nameIdentifier = name.includes(".")
								? `__webpack_provided_${name.replace(/\./g, "_dot_")}`
								: name;
							const dep = new ProvidedDependency(
								request[0],
								nameIdentifier,
								request.slice(1),
								expr.range
							);
							dep.loc = expr.loc;
							parser.state.module.addDependency(dep);
							return true;
						});

						parser.hooks.call.for(name).tap(PLUGIN_NAME, expr => {
							const nameIdentifier = name.includes(".")
								? `__webpack_provided_${name.replace(/\./g, "_dot_")}`
								: name;
							const dep = new ProvidedDependency(
								request[0],
								nameIdentifier,
								request.slice(1),
								expr.callee.range
							);
							dep.loc = expr.callee.loc;
							parser.state.module.addDependency(dep);
							parser.walkExpressions(expr.arguments);
							return true;
						});
					});
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
