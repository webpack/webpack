/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */

/**
 * Dependency for static evaluating import specifier. e.g.
 * @example
 * import a from "a";
 * "x" in a;
 * a.x !== undefined; // if x value statically analyzable
 */
class HarmonyEvaluatedImportSpecifierDependency extends HarmonyImportSpecifierDependency {
	constructor(
		request,
		sourceOrder,
		ids,
		name,
		range,
		assertions,
		operator,
		value,
		importSpecifierRange
	) {
		super(request, sourceOrder, ids, name, range, false, assertions);
		this.operator = operator;
		this.value = value;
		this.importSpecifierRange = importSpecifierRange;
	}

	get type() {
		return `evaluated X ${this.operator} harmony import specifier`;
	}

	serialize(context) {
		super.serialize(context);
		const { write } = context;
		write(this.operator);
		write(this.value);
		write(this.importSpecifierRange);
	}

	deserialize(context) {
		super.deserialize(context);
		const { read } = context;
		this.operator = read();
		this.value = read();
		this.importSpecifierRange = read();
	}
}

makeSerializable(
	HarmonyEvaluatedImportSpecifierDependency,
	"webpack/lib/dependencies/HarmonyEvaluatedImportSpecifierDependency"
);

HarmonyEvaluatedImportSpecifierDependency.Template = class HarmonyEvaluatedImportSpecifierDependencyTemplate extends (
	HarmonyImportSpecifierDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {HarmonyEvaluatedImportSpecifierDependency} */ (
			dependency
		);
		const { moduleGraph, runtime } = templateContext;
		const connection = moduleGraph.getConnection(dep);
		// Skip rendering depending when dependency is conditional
		if (connection && !connection.isTargetActive(runtime)) return;

		const exportsInfo = moduleGraph.getExportsInfo(connection.module);
		const ids = dep.getIds(moduleGraph);
		const value = exportsInfo.isExportProvided(ids);

		if (typeof value === "boolean") {
			source.replace(dep.range[0], dep.range[1] - 1, `${value}`);
		} else {
			this._applyForIds(
				dependency,
				source,
				templateContext,
				ids.slice(0, -1),
				dep.importSpecifierRange
			);
		}
	}
};

module.exports = HarmonyEvaluatedImportSpecifierDependency;
