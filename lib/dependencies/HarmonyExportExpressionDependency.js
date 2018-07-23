/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const NullDependency = require("./NullDependency");

/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */

class HarmonyExportExpressionDependency extends NullDependency {
	constructor(originModule, range, rangeStatement) {
		super();
		this.originModule = originModule;
		this.range = range;
		this.rangeStatement = rangeStatement;
	}

	get type() {
		return "harmony export expression";
	}

	getExports() {
		return {
			exports: ["default"],
			dependencies: undefined
		};
	}
}

HarmonyExportExpressionDependency.Template = class HarmonyExportDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {HarmonyExportExpressionDependency} */ (dependency);
		const used = dep.originModule.isUsed("default");
		const content = this.getContent(dep.originModule, used);

		if (dep.range) {
			source.replace(dep.rangeStatement[0], dep.range[0] - 1, content + "(");
			source.replace(dep.range[1], dep.rangeStatement[1] - 1, ");");
			return;
		}

		source.replace(dep.rangeStatement[0], dep.rangeStatement[1] - 1, content);
	}

	getContent(module, used) {
		const exportsName = module.exportsArgument;
		if (used) {
			return `/* harmony default export */ ${exportsName}[${JSON.stringify(
				used
			)}] = `;
		}
		return "/* unused harmony default export */ var _unused_webpack_default_export = ";
	}
};

module.exports = HarmonyExportExpressionDependency;
