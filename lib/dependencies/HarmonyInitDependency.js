/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import('../Module')} Module **/
/** @typedef {import('../Dependency')} Dependency **/
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

/** @typedef {import('../Dependency').DependencyTemplate} DependencyTemplate **/
/** @typedef {import('./NullDependency').HarmonyInitDependencyTemplate} HarmonyDependencyTemplate **/

const NullDependency = require("./NullDependency");

class HarmonyInitDependency extends NullDependency {
	/**
	 * @param {Module} originModule original module
	 */
	constructor(originModule) {
		super();
		/** @type {Module} */
		this.originModule = originModule;
	}

	/**
	 * @override
	 */
	get type() {
		return "harmony init";
	}
}

module.exports = HarmonyInitDependency;

HarmonyInitDependency.Template = class HarmonyInitDependencyTemplate {
	/**
	 * @param {HarmonyInitDependency} dep dependency
	 * @param {ReplaceSource} source source
	 * @param {RuntimeTemplate} runtime runtime template
	 * @param {Map<Function, DependencyTemplate | HarmonyDependencyTemplate>} dependencyTemplates dependencies map
	 * @override
	 * @returns {void}
	 */
	apply(dep, source, runtime, dependencyTemplates) {
		const module = dep.originModule;
		/**
		 * @typedef {number} IndexInList
		 * @type {Array<{order: number, listOrder: IndexInList, dependency: Dependency, template: HarmonyDependencyTemplate}>}
		 */
		const list = [];
		for (const dependency of module.dependencies) {
			const template = dependencyTemplates.get(dependency.constructor);

			if (
				template &&
				typeof /** @type {HarmonyDependencyTemplate} */ (template).harmonyInit ===
					"function" &&
				typeof /** @type {HarmonyDependencyTemplate} */ (template).getHarmonyInitOrder ===
					"function"
			) {
				const order = /** @type {HarmonyDependencyTemplate} */ (template).getHarmonyInitOrder(
					dependency
				);
				if (!isNaN(order)) {
					list.push({
						order,
						listOrder: list.length,
						dependency,
						template: /** @type {HarmonyDependencyTemplate} */ (template)
					});
				}
			}
		}

		list.sort((a, b) => {
			const x = a.order - b.order;
			if (x) return x;
			return a.listOrder - b.listOrder;
		});

		for (const item of list) {
			item.template.harmonyInit(
				item.dependency,
				source,
				runtime,
				dependencyTemplates
			);
		}
	}
};
