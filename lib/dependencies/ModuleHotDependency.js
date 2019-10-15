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

class ModuleHotDependency extends NullDependency {
	constructor(range, apiMethod) {
		super();

		this.range = range;
		this.apiMethod = apiMethod;
	}

	get type() {
		return "module.hot";
	}

	serialize(context) {
		const { write } = context;

		write(this.range);
		write(this.apiMethod);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.range = read();
		this.apiMethod = read();

		super.deserialize(context);
	}
}

makeSerializable(
	ModuleHotDependency,
	"webpack/lib/dependencies/ModuleHotDependency"
);

ModuleHotDependency.Template = class ModuleHotDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { module, runtimeRequirements }) {
		const dep = /** @type {ModuleHotDependency} */ (dependency);
		runtimeRequirements.add(RuntimeGlobals.module);
		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			`${module.moduleArgument}.hot${dep.apiMethod ? `.${dep.apiMethod}` : ""}`
		);
	}
};

module.exports = ModuleHotDependency;
