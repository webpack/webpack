/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ContextDependency = require("./ContextDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */

class ContextDependencyTemplateAsId extends ContextDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ runtimeTemplate, moduleGraph, chunkGraph, runtimeRequirements }
	) {
		const dep = /** @type {ContextDependency} */ (dependency);
		const module = moduleGraph.getModule(dep);
		const moduleExports = runtimeTemplate.moduleExports({
			module,
			chunkGraph,
			request: dep.request,
			weak: dep.weak,
			runtimeRequirements
		});

		if (module) {
			if (dep.valueRange) {
				if (Array.isArray(dep.replaces)) {
					for (let i = 0; i < dep.replaces.length; i++) {
						const rep = dep.replaces[i];
						source.replace(rep.range[0], rep.range[1] - 1, rep.value);
					}
				}
				source.replace(dep.valueRange[1], dep.range[1] - 1, ")");
				source.replace(
					dep.range[0],
					dep.valueRange[0] - 1,
					`${moduleExports}.resolve(`
				);
			} else {
				source.replace(
					dep.range[0],
					dep.range[1] - 1,
					`${moduleExports}.resolve`
				);
			}
		} else {
			source.replace(dep.range[0], dep.range[1] - 1, moduleExports);
		}
	}
}
module.exports = ContextDependencyTemplateAsId;
