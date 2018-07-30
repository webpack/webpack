/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").TemplateContext} TemplateContext */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../util/createHash").Hash} Hash */

class ModuleDecoratorDependency extends ModuleDependency {
	constructor(request, originModule) {
		super(request);
		this.originModule = originModule;
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @returns {void}
	 */
	updateHash(hash) {
		super.updateHash(hash);
		hash.update("module decorator");
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
	 * @param {TemplateContext} templateContext the template context
	 * @returns {InitFragment[]|null} the init fragments
	 */
	getInitFragments(dependency, { runtimeTemplate, dependencyTemplates }) {
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
