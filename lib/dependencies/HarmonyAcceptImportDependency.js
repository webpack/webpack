/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const HarmonyImportDependency = require("./HarmonyImportDependency");

/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */

class HarmonyAcceptImportDependency extends HarmonyImportDependency {
	constructor(request, originModule, parserScope) {
		super(request, originModule, NaN, parserScope);
		this.weak = true;
	}

	get type() {
		return "harmony accept";
	}
}

HarmonyAcceptImportDependency.Template = class HarmonyAcceptImportDependencyTemplate extends HarmonyImportDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		// no-op
	}
};

module.exports = HarmonyAcceptImportDependency;
