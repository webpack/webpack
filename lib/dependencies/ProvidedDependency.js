/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const InitFragment = require("../InitFragment");
const Template = require("../Template");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

/**
 * @param {ProvidedDependency} dependency [TODO]
 * @returns {string} [TODO]
 */
const getImportVarName = dependency => {
	return `${Template.toIdentifier(dependency.name)}__WEBPACK_PROVIDED_MODULE__`;
};

class ProvidedDependency extends ModuleDependency {
	constructor(request, originModule, name, specifier, range) {
		super(request);
		this.originModule = originModule;
		this.name = name;
		this.specifier = specifier;
		this.range = range;
	}

	get type() {
		return "provided";
	}
}

ProvidedDependency.Template = class ProvidedDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {ProvidedDependency} */ (dependency);
		const binding = runtimeTemplate.exportFromImport({
			module: dep.module,
			originModule: dep.originModule,
			request: dep.request,
			importVar: getImportVarName(dep),
			exportName: dep.specifier,
			asiSafe: true,
			isCall: false,
			callContext: null
		});
		source.replace(dep.range[0], dep.range[1] - 1, binding);
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
				runtimeTemplate.importStatement({
					update: false,
					module: dep.module,
					originModule: dep.originModule,
					request: dep.request,
					importVar: getImportVarName(dep)
				}),
				0,
				`provided ${dep.name}`
			)
		];
	}
};

module.exports = ProvidedDependency;
