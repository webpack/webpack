/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HarmonyImportDependency = require("./HarmonyImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */

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
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		// no-op
	}
};

module.exports = HarmonyAcceptImportDependency;
