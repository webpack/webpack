/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ConstDependency = require("./dependencies/ConstDependency");
const ProvidedDependency = require("./dependencies/ProvidedDependency");
const { approve } = require("./javascript/JavascriptParserHelpers");

/** @typedef {import("./Compiler")} Compiler */

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
			"ProvidePlugin",
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
								parser.hooks.canRename.for(name).tap("ProvidePlugin", approve);
							});
						}

						parser.hooks.expression.for(name).tap("ProvidePlugin", expr => {
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

						parser.hooks.call.for(name).tap("ProvidePlugin", expr => {
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
					.for("javascript/auto")
					.tap("ProvidePlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("ProvidePlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("ProvidePlugin", handler);
			}
		);
	}
}

module.exports = ProvidePlugin;
