/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const Template = require("../Template");

/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { Ids } from "../dependencies/HarmonyImportDependency" */
/** @import { JavascriptModuleBuildInfo } from "../javascript/JavascriptModule" */

/**
 * What each module graph the feature runs on must not bind. Presence of an
 * entry is what marks the feature active.
 * @typedef {object} LocalImportBindingsState
 * @property {Set<Module>} cyclicModules modules whose exports a peer may read before they are initialized
 * @property {Map<Module, Set<Module>>} acceptedModules per module, the modules it accepts a hot update from
 */

/** @type {WeakMap<ModuleGraph, LocalImportBindingsState>} */
const stateByModuleGraph = new WeakMap();

/**
 * Marks local import bindings as active for this module graph.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {LocalImportBindingsState} state what must not be bound
 * @returns {void}
 */
const enableLocalImportBindings = (moduleGraph, state) => {
	stateByModuleGraph.set(moduleGraph, state);
};

/**
 * Reports whether a local variable holding the imported value is observationally
 * equal to the live binding. A namespace object qualifies by identity; a named
 * import needs an export the language pins and an initialization that has
 * provably already run. A hot update re-runs the import statement rather than
 * the module body, so an accepted module's exports are read live either way.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {Module} originModule the module holding the reference
 * @param {Module} module the imported module
 * @param {Ids} ids the imported export path
 * @returns {boolean} true when the value can be read once into a local
 */
const isStableImport = (moduleGraph, originModule, module, ids) => {
	const state = stateByModuleGraph.get(moduleGraph);
	if (state === undefined) return false;
	const accepted = state.acceptedModules.get(originModule);
	if (accepted !== undefined && accepted.has(module)) return false;
	// The namespace object is created before the module body runs and is never
	// replaced, so even a cycle peer sees the object it will keep seeing.
	if (ids.length === 0) return true;
	if (ids.length !== 1 || state.cyclicModules.has(module)) return false;
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
