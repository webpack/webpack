/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */

class HarmonyExportHeaderDependency extends NullDependency {
	constructor(range, rangeStatement) {
		super();
		this.range = range;
		this.rangeStatement = rangeStatement;
	}

	get type() {
		return "harmony export header";
	}

	serialize(context) {
		const { write } = context;
		write(this.range);
		write(this.rangeStatement);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.range = read();
		this.rangeStatement = read();
		super.deserialize(context);
	}
}

makeSerializable(
	HarmonyExportHeaderDependency,
	"webpack/lib/dependencies/HarmonyExportHeaderDependency"
);

HarmonyExportHeaderDependency.Template = class HarmonyExportDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {HarmonyExportHeaderDependency} */ (dependency);
		const content = "";
		const replaceUntil = dep.range
			? dep.range[0] - 1
			: dep.rangeStatement[1] - 1;
		source.replace(dep.rangeStatement[0], replaceUntil, content);
	}
};

module.exports = HarmonyExportHeaderDependency;
