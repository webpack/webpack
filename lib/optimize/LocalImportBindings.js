/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const ESMAcceptDependency = require("../dependencies/esm/ESMAcceptDependency");
const Template = require("../template/Template");
const CircularModulesPlugin = require("./CircularModulesPlugin");

/** @import { Ids } from "../dependencies/esm/ESMImportDependency" */
/** @import ModuleGraph from "../graph/ModuleGraph" */
/** @import { JavascriptModuleBuildInfo } from "../javascript/JavascriptModule" */
/** @import Module from "../module/Module" */

const { CircularKind } = CircularModulesPlugin;

/** @type {WeakMap<Module, boolean>} */
const acceptsHotUpdateCache = new WeakMap();

/**
 * Reports whether the module takes a hot update of something it imports. The
 * accept handler re-runs the import statement rather than the module body, so
 * a value read once into a local would be the one the update replaced.
 * @param {Module} module the module holding the reference
 * @returns {boolean} true when the module accepts a hot update
 */
const acceptsHotUpdate = (module) => {
	let accepts = acceptsHotUpdateCache.get(module);
	if (accepts === undefined) {
		accepts = module.dependencies.some(
			(dependency) => dependency instanceof ESMAcceptDependency
		);
		acceptsHotUpdateCache.set(module, accepts);
	}
	return accepts;
};

/**
 * Reports whether the module has run by the time an importer reads it: a cycle
 * peer may reach an export before its initializer did, which only the namespace
 * answers with the error the source itself would give. Asked of the kind
 * itself, so a graph nothing analyzed keeps the namespace too.
 * @param {Module} module the module read from
 * @returns {boolean} true when reading it at import time is too early
 */
const mayBeReadTooEarly = (module) => {
	const circularKind = CircularModulesPlugin.getCircularKind(module);
	return (
		circularKind === undefined || (circularKind & CircularKind.Binding) !== 0
	);
};

/**
 * Reports whether a local variable holding the imported value is observationally
 * equal to the live binding. A namespace object qualifies by identity; a named
 * import needs an export the language pins and an initialization that has
 * provably already run.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} originModule the module holding the reference
 * @param {Module} module the imported module
 * @param {Ids} ids the imported export path
 * @returns {boolean} true when the value can be read once into a local
 */
const isStableImport = (moduleGraph, originModule, module, ids) => {
	if (acceptsHotUpdate(originModule)) return false;
	// The namespace object is created before the module body runs and is never
	// replaced, so even a cycle peer sees the object it will keep seeing.
	if (ids.length === 0) return true;
	if (ids.length !== 1 || mayBeReadTooEarly(module)) return false;
	// A re-export forwards to the binding another module declares, so that is
	// the module whose export must be pinned, and whose body must have run.
	let bindingModule = module;
	let bindingName = ids[0];
	const target = moduleGraph
		.getExportsInfo(module)
		.getReadOnlyExportInfo(bindingName)
		.getTarget(moduleGraph);
	if (target !== undefined) {
		if (
			target.deferred ||
			target.export === undefined ||
			target.export.length !== 1 ||
			mayBeReadTooEarly(target.module)
		) {
			return false;
		}
		bindingModule = target.module;
		bindingName = target.export[0];
	}
	const buildInfo =
		/** @type {JavascriptModuleBuildInfo | undefined} */
		(bindingModule.buildInfo);
	return (
		buildInfo !== undefined &&
		buildInfo.stableExports !== undefined &&
		buildInfo.stableExports.has(bindingName)
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

module.exports.isDeclarableBindingName = isDeclarableBindingName;
module.exports.isStableImport = isStableImport;
