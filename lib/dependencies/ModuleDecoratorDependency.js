/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

class ModuleDecoratorDependency extends ModuleDependency {
	constructor(request, originModule) {
		super(request);
		this.originModule = originModule;
	}
}

ModuleDecoratorDependency.Template = class ModuleDecoratorDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {InitFragment[]|null} the init fragments
	 */
	getInitFragments(dependency, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {ModuleDecoratorDependency} */ (dependency);
		return [
			new InitFragment(
				`/* module decorator */ ${
					dep.originModule.moduleArgument
				} = ${runtimeTemplate.moduleExports({
					module: dep.module,
					request: dep.request
				})}(${dep.originModule.moduleArgument});\n`,
				InitFragment.STAGE_PROVIDES,
				0,
				`module decorator ${dep.originModule.id}`
			)
		];
	}
};

module.exports = ModuleDecoratorDependency;
