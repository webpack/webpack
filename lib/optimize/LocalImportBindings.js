/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const Template = require("../template/Template");
const CircularModulesPlugin = require("./CircularModulesPlugin");

/** @import { Ids } from "../dependencies/esm/ESMImportDependency" */
/** @import ModuleGraph from "../graph/ModuleGraph" */
/** @import { JavascriptModuleBuildInfo } from "../javascript/JavascriptModule" */
/** @import Module from "../module/Module" */

const { CircularKind } = CircularModulesPlugin;

/**
 * Per module, the modules it accepts a hot update from. An entry for a module
 * graph is what marks the feature active for it.
 * @type {WeakMap<ModuleGraph, Map<Module, Set<Module>>>}
 */
const acceptedModulesByModuleGraph = new WeakMap();

/**
 * Marks local import bindings as active for this module graph.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {Map<Module, Set<Module>>} acceptedModules per module, the modules it accepts a hot update from
 * @returns {void}
 */
const enableLocalImportBindings = (moduleGraph, acceptedModules) => {
	acceptedModulesByModuleGraph.set(moduleGraph, acceptedModules);
};

/**
 * Reports whether a local variable holding the imported value is observationally
 * equal to the live binding. A namespace object qualifies by identity; a named
 * import needs an export the language pins and an initialization that has
 * provably already run.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {Module} originModule the module holding the reference
 * @param {Module} module the imported module
 * @param {Ids} ids the imported export path
 * @returns {boolean} true when the value can be read once into a local
 */
const isStableImport = (moduleGraph, originModule, module, ids) => {
	const acceptedModules = acceptedModulesByModuleGraph.get(moduleGraph);
	if (acceptedModules === undefined) return false;
	// A hot update re-runs the import statement rather than the module body, so
	// an accepted module's exports are read live either way.
	const accepted = acceptedModules.get(originModule);
	if (accepted !== undefined && accepted.has(module)) return false;
	// The namespace object is created before the module body runs and is never
	// replaced, so even a cycle peer sees the object it will keep seeing.
	if (ids.length === 0) return true;
	// A cycle peer may reach the export before its initializer ran, which only
	// the namespace answers with the error the source itself would give.
	if (
		ids.length !== 1 ||
		CircularModulesPlugin.isCircular(module, CircularKind.Binding)
	) {
		return false;
	}
	const buildInfo =
		/** @type {JavascriptModuleBuildInfo | undefined} */
		(module.buildInfo);
	return (
		buildInfo !== undefined &&
		buildInfo.stableExports !== undefined &&
		buildInfo.stableExports.has(ids[0])
	);
};

/**
 * Reports whether the name can be declared next to webpack's own module-scope
 * variables. An ES module binding never collides with another one webpack
 * declares for the same module, but it may be spelled in a way the generated
 * code cannot repeat, or claim a name webpack reserves for itself.
 * @param {string} name the imported binding's local name
 * @returns {boolean} true when the name is safe to declare
 */
const isDeclarableBindingName = (name) =>
	name.length > 0 &&
	Template.toIdentifier(name) === name &&
	!name.startsWith("__webpack");

module.exports.enableLocalImportBindings = enableLocalImportBindings;
module.exports.isDeclarableBindingName = isDeclarableBindingName;
module.exports.isStableImport = isStableImport;
