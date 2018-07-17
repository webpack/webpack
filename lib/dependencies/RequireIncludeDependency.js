/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Template = require("../Template");
const DependencyReference = require("./DependencyReference");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */

class RequireIncludeDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	/**
	 * Returns the referenced module and export
	 * @returns {DependencyReference} reference
	 */
	getReference() {
		if (!this.module) return null;
		// This doesn't use any export
		return new DependencyReference(() => this.module, [], false);
	}

	get type() {
		return "require.include";
	}
}

RequireIncludeDependency.Template = class RequireIncludeDependencyTemplate extends ModuleDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { runtimeTemplate }) {
		const dep = /** @type {RequireIncludeDependency} */ (dependency);
		const comment = runtimeTemplate.outputOptions.pathinfo
			? Template.toComment(
					`require.include ${runtimeTemplate.requestShortener.shorten(
						dep.request
					)}`
			  )
			: "";
		source.replace(dep.range[0], dep.range[1] - 1, `undefined${comment}`);
	}
};

module.exports = RequireIncludeDependency;
