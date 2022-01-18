/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class CssImportDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {[number, number]} range range of the argument
	 * @param {string | undefined} supports list of supports conditions
	 * @param {string | undefined} media list of media conditions
	 */
	constructor(request, range, supports, media) {
		super(request);
		this.range = range;
		this.supports = supports;
		this.media = media;
	}

	get type() {
		return "css @import";
	}

	get category() {
		return "css-import";
	}

	/**
	 * @param {string} context context directory
	 * @returns {Module} a module
	 */
	createIgnoredModule(context) {
		return null;
	}
}

CssImportDependency.Template = class CssImportDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {CssImportDependency} */ (dependency);

		source.replace(dep.range[0], dep.range[1] - 1, "");
	}
};

makeSerializable(
	CssImportDependency,
	"webpack/lib/dependencies/CssImportDependency"
);

module.exports = CssImportDependency;
