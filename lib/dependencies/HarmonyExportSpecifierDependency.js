/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

class HarmonyExportSpecifierDependency extends NullDependency {
	constructor(originModule, id, name) {
		super();
		this.originModule = originModule;
		this.id = id;
		this.name = name;
	}

	get type() {
		return "harmony export specifier";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		return {
			exports: [this.name],
			dependencies: undefined
		};
	}
}

HarmonyExportSpecifierDependency.Template = class HarmonyExportSpecifierDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		// no-op
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {DependencyTemplateContext} templateContext the template context
	 * @returns {InitFragment[]|null} the init fragments
	 */
	getInitFragments(dependency, { moduleGraph }) {
		return [
			new InitFragment(
				this.getContent(moduleGraph, dependency),
				InitFragment.STAGE_HARMONY_EXPORTS,
				1
			)
		];
	}

	getContent(moduleGraph, dep) {
		const used = dep.originModule.isUsed(moduleGraph, dep.name);
		if (!used) {
			return `/* unused harmony export ${dep.name || "namespace"} */\n`;
		}

		const exportsName = dep.originModule.exportsArgument;

		return `/* harmony export (binding) */ __webpack_require__.d(${exportsName}, ${JSON.stringify(
			used
		)}, function() { return ${dep.id}; });\n`;
	}
};

module.exports = HarmonyExportSpecifierDependency;
