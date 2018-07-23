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
/** @typedef {import("../DependencyTemplate")} DependencyTemplate */

class HarmonyInitDependency extends NullDependency {
	constructor(originModule) {
		super();
		this.originModule = originModule;
	}

	get type() {
		return "harmony init";
	}
}

module.exports = HarmonyInitDependency;

HarmonyInitDependency.Template = class HarmonyInitDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {void}
	 */
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		const dep = /** @type {HarmonyInitDependency} */ (dependency);
		const module = dep.originModule;
		const list = [];
		for (const dependency of module.dependencies) {
			const tmpl = dependencyTemplates.get(dependency.constructor);
			/** @typedef {DependencyTemplate & { harmonyInit?: Function, getHarmonyInitOrder?: Function }} DepTemplWithHarmony */
			const template = /** @type {DepTemplWithHarmony} */ (tmpl);
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
				runtimeTemplate,
				dependencyTemplates
			);
		}
	}
};
