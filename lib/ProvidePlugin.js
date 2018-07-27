/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("./InitFragment");
const { approve } = require("./JavascriptParserHelpers");
const NullFactory = require("./NullFactory");
const ConstDependency = require("./dependencies/ConstDependency");
const ModuleDependency = require("./dependencies/ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */

/**
 * @param {string[]} path the property path array
 * @returns {string} the converted path
 */
const pathToString = path =>
	path.length > 0 ? path.map(part => `[${JSON.stringify(part)}]`).join("") : "";

class ProvidePlugin {
	constructor(definitions) {
		this.definitions = definitions;
	}

	apply(compiler) {
		const definitions = this.definitions;
		compiler.hooks.compilation.tap(
			"ProvidePlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(ConstDependency, new NullFactory());
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
					new ProvidedDependencyTemplate()
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

class ProvidedDependency extends ModuleDependency {
	constructor(request, identifier, path, range) {
		super(request);
		this.identifier = identifier;
		this.path = path;
		this.range = range;
	}
}

class ProvidedDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {ProvidedDependency} */ (dependency);
		source.replace(dep.range[0], dep.range[1] - 1, dep.identifier);
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {InitFragment[]|null} the init fragments
	 */
	getInitFragments(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {ProvidedDependency} */ (dependency);
		return [
			new InitFragment(
				`/* provided dependency */ var ${
					dep.identifier
				} = ${runtimeTemplate.moduleExports({
					module: dep.module,
					request: dep.request
				})}${pathToString(dep.path)};\n`,
				1,
				`provided ${dep.identifier}`
			)
		];
	}
}

module.exports = ProvidePlugin;
