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
	constructor(request, sourceOrder, ids, name, range, assertions, operator) {
		super(request, sourceOrder, ids, name, range, false, assertions);
		this.operator = operator;
	}

	get type() {
		return `evaluated X ${this.operator} harmony import specifier`;
	}

	serialize(context) {
		super.serialize(context);
		const { write } = context;
		write(this.operator);
	}

	deserialize(context) {
		super.deserialize(context);
		const { read } = context;
		this.operator = read();
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
			const usedName = exportsInfo.getUsedName(ids, runtime);

			const code = this._getCodeForIds(
				dep,
				source,
				templateContext,
				ids.slice(0, -1)
			);
			source.replace(
				dep.range[0],
				dep.range[1] - 1,
				`${
					usedName ? JSON.stringify(usedName[usedName.length - 1]) : '""'
				} in ${code}`
			);
		}
	}
};

module.exports = HarmonyEvaluatedImportSpecifierDependency;
