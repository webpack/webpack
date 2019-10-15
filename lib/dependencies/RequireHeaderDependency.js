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

class RequireHeaderDependency extends NullDependency {
	constructor(range) {
		super();
		if (!Array.isArray(range)) throw new Error("range must be valid");
		this.range = range;
	}

	serialize(context) {
		const { write } = context;
		write(this.range);
		super.serialize(context);
	}

	static deserialize(context) {
		const obj = new RequireHeaderDependency(context.read());
		obj.deserialize(context);
		return obj;
	}
}

makeSerializable(
	RequireHeaderDependency,
	"webpack/lib/dependencies/RequireHeaderDependency"
);

RequireHeaderDependency.Template = class RequireHeaderDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { runtimeRequirements }) {
		const dep = /** @type {RequireHeaderDependency} */ (dependency);
		runtimeRequirements.add(RuntimeGlobals.require);
		source.replace(dep.range[0], dep.range[1] - 1, "__webpack_require__");
	}
};

module.exports = RequireHeaderDependency;
