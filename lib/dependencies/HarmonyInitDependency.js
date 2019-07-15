/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("../Module")} Module **/
/** @typedef {import("../Dependency")} Dependency **/
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../Dependency").DependencyTemplate} DependencyTemplate */

const NullDependency = require("./NullDependency");
const AbstractMethodError = require("../AbstractMethodError");

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

class HarmonyDependencyTemplate extends NullDependency.Template {
	/**
	 * Applying harmony template
	 * @param {Dependency} dep applying dependency
	 * @param {Source} source source
	 * @param {RuntimeTemplate} runtime runtime template
	 * @param {Map<Function, DependencyTemplate>} dependencyTemplates all templates
	 * @returns {void}
	 */
	harmonyInit(dep, source, runtime, dependencyTemplates) {
		throw new AbstractMethodError();
	}

	/**
	 * @param {Dependency} dep dependency
	 * @returns {number} template execution order priority
	 */
	getHarmonyInitOrder(dep) {
		throw new AbstractMethodError();
	}
}

HarmonyInitDependency.Template = class HarmonyInitDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {HarmonyInitDependency} dep dependency
	 * @param {ReplaceSource} source source
	 * @param {RuntimeTemplate} runtime runtime template
	 * @param {Map<Function, NullDependency.Template | HarmonyDependencyTemplate>} dependencyTemplates dependencies map
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
			const template = /** @type {HarmonyDependencyTemplate} */ (dependencyTemplates.get(
				dependency.constructor
			));

			if (
				template &&
				typeof template.harmonyInit === "function" &&
				typeof template.getHarmonyInitOrder === "function"
			) {
				const order = template.getHarmonyInitOrder(dependency);
				if (!isNaN(order)) {
					list.push({
						order,
						listOrder: list.length,
						dependency,
						template
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

exports.HarmonyDependencyTemplate = HarmonyDependencyTemplate;
exports.HarmonyInitDependency = HarmonyInitDependency;
