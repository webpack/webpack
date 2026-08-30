/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ContextDependency = require("./ContextDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import { Range } from "../javascript/JavascriptParser" */
/** @import Dependency from "../Dependency" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */

class ContextDependencyTemplateAsRequireCall
	extends ContextDependency.Template
{
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { runtimeTemplate, moduleGraph, chunkGraph, runtimeRequirements } =
			templateContext;
		const dep = /** @type {ContextDependency} */ (dependency);
		let moduleExports = runtimeTemplate.moduleExports({
			module: moduleGraph.getModule(dep),
			chunkGraph,
			request: /** @type {string} */ (dep.request),
			runtimeRequirements
		});

		if (dep.inShorthand) {
			moduleExports = `${dep.inShorthand}: ${moduleExports}`;
		}

		const range = /** @type {Range} */ (dep.range);

		if (moduleGraph.getModule(dep)) {
			if (dep.valueRange) {
				if (Array.isArray(dep.replaces)) {
					for (let i = 0; i < dep.replaces.length; i++) {
						const rep = dep.replaces[i];
						source.replace(rep.range[0], rep.range[1] - 1, rep.value);
					}
				}
				this.replaceCall(dep, source, moduleExports, templateContext);
			} else {
				source.replace(range[0], range[1] - 1, moduleExports);
			}
		} else {
			source.replace(range[0], range[1] - 1, moduleExports);
		}
	}

	/**
	 * Rewrites the call around its request, dropping anything the original one
	 * carried after it. Overridden where a later argument must be kept.
	 * @param {ContextDependency} dep the dependency
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {string} moduleExports the expression the request is passed to
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	replaceCall(dep, source, moduleExports, templateContext) {
		const range = /** @type {Range} */ (dep.range);
		const valueRange = /** @type {Range} */ (dep.valueRange);
		source.replace(valueRange[1], range[1] - 1, ")");
		source.replace(range[0], valueRange[0] - 1, `${moduleExports}(`);
	}
}

module.exports = ContextDependencyTemplateAsRequireCall;
