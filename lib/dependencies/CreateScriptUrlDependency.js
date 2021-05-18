/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */

class CreateScriptUrlDependency extends NullDependency {
	/**
	 * @param {[number, number]} range range
	 */
	constructor(range) {
		super();
		this.range = range;
	}

	get type() {
		return "create script url";
	}
}

CreateScriptUrlDependency.Template = class CreateScriptUrlDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { runtimeRequirements }) {
		const dep = /** @type {CreateScriptUrlDependency} */ (dependency);

		runtimeRequirements.add(RuntimeGlobals.createScriptUrl);

		source.insert(dep.range[0], `${RuntimeGlobals.createScriptUrl}(`);
		source.insert(dep.range[1], ")");
	}
};

makeSerializable(
	CreateScriptUrlDependency,
	"webpack/lib/dependencies/CreateScriptUrlDependency"
);

module.exports = CreateScriptUrlDependency;
