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

class HarmonyInOperatorImportSpecifierDependency extends HarmonyImportSpecifierDependency {
	constructor(...args) {
		super(...args);
		this.exportPresenceMode = false;
	}
}

makeSerializable(
	HarmonyInOperatorImportSpecifierDependency,
	"webpack/lib/dependencies/HarmonyInOperatorImportSpecifierDependency"
);

HarmonyInOperatorImportSpecifierDependency.Template = class HarmonyInOperatorImportSpecifierDependencyTemplate extends (
	HarmonyImportSpecifierDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {HarmonyInOperatorImportSpecifierDependency} */ (
			dependency
		);
		const { moduleGraph, runtime } = templateContext;
		const connection = moduleGraph.getConnection(dep);
		// Skip rendering depending when dependency is conditional
		if (connection && !connection.isTargetActive(runtime)) return;

		const exportsInfo = moduleGraph.getExportsInfo(connection.module);
		const value = exportsInfo.isExportProvided(dep.getIds(moduleGraph));

		if (dep.shorthand) {
			source.insert(dep.range[1], `: ${value}`);
		} else {
			source.replace(dep.range[0], dep.range[1] - 1, `${value}`);
		}
	}
};

module.exports = HarmonyInOperatorImportSpecifierDependency;
