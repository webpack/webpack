/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */

class HarmonyAwaitDependency extends NullDependency {
	/**
	 * @param {number[]} range [start, end] of the AwaitExpression
	 * @param {number[]} argumentRange [start, end] of the argument inside the AwaitExpression
	 */
	constructor(range, argumentRange) {
		super();
		this.range = range;
		this.argumentRange = argumentRange;
	}

	get type() {
		return "harmony await";
	}
}

HarmonyAwaitDependency.Template = class HarmonyAwaitDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {HarmonyAwaitDependency} */ (dependency);

		// AST SURGERY:
		// We replace the exact `await` keyword with `Promise.resolve(`
		// e.g., `await x` -> `Promise.resolve(x).then(__webpack_async_result__ => { ... })`

		// 1. Replace the "await " part (from range[0] to argumentRange[0] - 1)
		source.replace(dep.range[0], dep.argumentRange[0] - 1, "Promise.resolve(");

		// 2. Append the `.then()` chain at the end of the argument
		source.insert(dep.argumentRange[1], ").then(__webpack_async_result__ => {");

		// Note: Closing the bracket `})` requires tracking the block scope,
		// which we will hook into the module footer later.
	}
};

module.exports = HarmonyAwaitDependency;
