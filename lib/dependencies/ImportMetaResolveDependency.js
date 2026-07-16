/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");
const URLDependency = require("./URLDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */

// `import.meta.resolve(specifier)` is the string form of
// `new URL(specifier, import.meta.url)`, so it reuses the URL asset pipeline
// but renders to the resolved URL string (`.href`) over the whole call.
class ImportMetaResolveDependency extends URLDependency {
	get type() {
		return "import.meta.resolve()";
	}
}

ImportMetaResolveDependency.Template = class ImportMetaResolveDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const {
			chunkGraph,
			moduleGraph,
			runtimeRequirements,
			runtimeTemplate,
			runtime
		} = templateContext;
		const dep = /** @type {ImportMetaResolveDependency} */ (dependency);
		const connection = moduleGraph.getConnection(dep);
		// Skip rendering the dependency when it is conditional and inactive.
		if (connection && !connection.isTargetActive(runtime)) {
			source.replace(
				dep.outerRange[0],
				dep.outerRange[1] - 1,
				"/* unused asset import */ undefined"
			);
			return;
		}

		runtimeRequirements.add(RuntimeGlobals.require);

		const moduleRaw = runtimeTemplate.moduleRaw({
			chunkGraph,
			module: moduleGraph.getModule(dep),
			request: dep.request,
			runtimeRequirements,
			weak: false
		});

		if (dep.relative) {
			runtimeRequirements.add(RuntimeGlobals.relativeUrl);
			source.replace(
				dep.outerRange[0],
				dep.outerRange[1] - 1,
				`(new ${RuntimeGlobals.relativeUrl}(/* asset import */ ${moduleRaw})).href`
			);
		} else {
			runtimeRequirements.add(RuntimeGlobals.baseURI);
			source.replace(
				dep.outerRange[0],
				dep.outerRange[1] - 1,
				`(new URL(/* asset import */ ${moduleRaw}, ${RuntimeGlobals.baseURI})).href`
			);
		}
	}
};

makeSerializable(
	ImportMetaResolveDependency,
	"webpack/lib/dependencies/ImportMetaResolveDependency"
);

module.exports = ImportMetaResolveDependency;
