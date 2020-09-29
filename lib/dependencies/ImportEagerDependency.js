/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ImportDependency = require("./ImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

class ImportEagerDependency extends ImportDependency {
	/**
	 * @param {string} request the request
	 * @param {[number, number]} range expression range
	 * @param {string[][]=} referencedExports list of referenced exports
	 */
	constructor(request, range, referencedExports) {
		super(request, range, referencedExports);
	}

	get type() {
		return "import() eager";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	ImportEagerDependency,
	"webpack/lib/dependencies/ImportEagerDependency"
);

ImportEagerDependency.Template = class ImportEagerDependencyTemplate extends ImportDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ runtimeTemplate, module, moduleGraph, chunkGraph, runtimeRequirements }
	) {
		const dep = /** @type {ImportEagerDependency} */ (dependency);
		const content = runtimeTemplate.moduleNamespacePromise({
			chunkGraph,
			module: moduleGraph.getModule(dep),
			request: dep.request,
			strict: module.buildMeta.strictHarmonyModule,
			message: "import() eager",
			runtimeRequirements
		});

		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
};

module.exports = ImportEagerDependency;
