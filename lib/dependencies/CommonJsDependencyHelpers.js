/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Entrypoint = require("../Entrypoint");
const RuntimeGlobals = require("../RuntimeGlobals");
const { propertyAccess } = require("../util/property");

/** @import ChunkGraph from "../ChunkGraph" */
/** @import Module, { RuntimeRequirements } from "../Module" */
/** @import RuntimeTemplate from "../RuntimeTemplate" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { RuntimeSpec } from "../util/runtime" */
/** @typedef {"exports" | "module.exports" | "this" | "Object.defineProperty(exports)" | "Object.defineProperty(module.exports)" | "Object.defineProperty(this)"} CommonJSDependencyBaseKeywords */

/**
 * The well-known name of the ESM named export that, when present, is unwrapped
 * by CommonJS `require()` to match Node.js v23+ `require(esm)` semantics:
 * https://nodejs.org/docs/latest/api/modules.html#loading-ecmascript-modules-using-require
 */
const ESM_MODULE_EXPORTS_NAME = "module.exports";

/**
 * Whether `require()` of `importedModule` would trigger Node.js's
 * `require(esm)` `"module.exports"` named-export unwrap. This is the
 * usage-independent eligibility check: it only looks at module type and
 * whether the export is declared, so it can be safely used from
 * `getReferencedExports` before usage info is finalized (otherwise the
 * check would be circular — we'd need `"module.exports"` to already be
 * marked used in order to ask whether to mark it used).
 * @param {Module} importedModule the imported module
 * @param {ModuleGraph} moduleGraph the module graph
 * @returns {boolean} true if `require()` should unwrap `"module.exports"`
 */
const isRequireEsmModuleExportsModule = (importedModule, moduleGraph) => {
	if (importedModule.getExportsType(moduleGraph, false) !== "namespace") {
		return false;
	}
	const exportsInfo = moduleGraph.getExportsInfo(importedModule);
	const exportInfo = exportsInfo.getReadOnlyExportInfo(ESM_MODULE_EXPORTS_NAME);
	return exportInfo.provided === true;
};

/**
 * When CommonJS `require()` resolves to an ES module that has a named export
 * with the literal string name `"module.exports"`, Node.js returns the value of
 * that export instead of the namespace object. Returns the property-access
 * expression to apply to the require result for that unwrapping, or `null` if
 * the imported module is not eligible (not strictly ESM, or no such export,
 * or the export was tree-shaken away).
 * @param {Module} importedModule the imported module
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
 * @returns {string | null} property-access expression (e.g. `["module.exports"]`), or `null`
 */
const getRequireEsmModuleExportsAccess = (
	importedModule,
	moduleGraph,
	runtime
) => {
	if (!isRequireEsmModuleExportsModule(importedModule, moduleGraph)) {
		return null;
	}
	const exportsInfo = moduleGraph.getExportsInfo(importedModule);
	// CJS exports are never inlined
	const usedName = exportsInfo.getUsedName([ESM_MODULE_EXPORTS_NAME], runtime);
	if (usedName === false) return null;
	return propertyAccess(/** @type {readonly string[]} */ (usedName));
};

module.exports.ESM_MODULE_EXPORTS_NAME = ESM_MODULE_EXPORTS_NAME;

module.exports.getRequireEsmModuleExportsAccess =
	getRequireEsmModuleExportsAccess;

/**
 * Whether the base keyword reads the module's top-level `this`.
 * @param {CommonJSDependencyBaseKeywords} depBase commonjs dependency base
 * @returns {boolean} true when the base is `this`
 */
const isThisBase = (depBase) =>
	depBase === "this" || depBase === "Object.defineProperty(this)";

/**
 * A classic worker script's top-level `this` is its global scope, not the
 * module's exports. True only for a runtime every entry of which is a worker,
 * so a module imported elsewhere keeps exports semantics in that runtime.
 * @param {Module} module the module
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {RuntimeSpec} runtime the runtime code is generated for
 * @param {RuntimeTemplate=} runtimeTemplate the runtime template
 * @returns {boolean} true when `this` is the worker's global scope
 */
const isWorkerEntryThis = (module, chunkGraph, runtime, runtimeTemplate) => {
	// a module worker or worklet is an ES module, where `this` is undefined and
	// there is nothing to resolve it to
	if (
		typeof runtime !== "string" ||
		runtimeTemplate === undefined ||
		runtimeTemplate.isModule()
	) {
		return false;
	}
	let workerEntry = false;
	for (const chunk of chunkGraph.getModuleChunks(module)) {
		if (chunk.runtime !== runtime) continue;
		for (const group of chunk.groupsIterable) {
			if (!(group instanceof Entrypoint)) continue;
			const { options } = group;
			// an entry may pin a worker to a non-worker entry's runtime, leaving one
			// code generation for both roles: keep exports, the only safe answer
			if (!options.worker || options.worklet) return false;
			workerEntry = true;
		}
	}
	return workerEntry;
};

/**
 * Returns type and base.
 * @param {CommonJSDependencyBaseKeywords} depBase commonjs dependency base
 * @param {Module} module module
 * @param {RuntimeRequirements} runtimeRequirements runtime requirements
 * @param {boolean=} isWorkerEntry whether `this` is a classic worker's global scope
 * @returns {[string, string]} type and base
 */
module.exports.handleDependencyBase = (
	depBase,
	module,
	runtimeRequirements,
	isWorkerEntry
) => {
	/** @type {string} */
	let base;
	/** @type {string} */
	let type;
	switch (depBase) {
		case "exports":
			runtimeRequirements.add(RuntimeGlobals.exports);
			base = module.exportsArgument;
			type = "expression";
			break;
		case "module.exports":
			runtimeRequirements.add(RuntimeGlobals.module);
			base = `${module.moduleArgument}.exports`;
			type = "expression";
			break;
		case "this":
			if (isWorkerEntry) {
				runtimeRequirements.add(RuntimeGlobals.global);
				base = RuntimeGlobals.global;
			} else {
				runtimeRequirements.add(RuntimeGlobals.thisAsExports);
				base = "this";
			}
			type = "expression";
			break;
		case "Object.defineProperty(exports)":
			runtimeRequirements.add(RuntimeGlobals.exports);
			base = module.exportsArgument;
			type = "Object.defineProperty";
			break;
		case "Object.defineProperty(module.exports)":
			runtimeRequirements.add(RuntimeGlobals.module);
			base = `${module.moduleArgument}.exports`;
			type = "Object.defineProperty";
			break;
		case "Object.defineProperty(this)":
			if (isWorkerEntry) {
				runtimeRequirements.add(RuntimeGlobals.global);
				base = RuntimeGlobals.global;
			} else {
				runtimeRequirements.add(RuntimeGlobals.thisAsExports);
				base = "this";
			}
			type = "Object.defineProperty";
			break;
		default:
			throw new Error(`Unsupported base ${depBase}`);
	}

	return [type, base];
};
module.exports.isRequireEsmModuleExportsModule =
	isRequireEsmModuleExportsModule;
module.exports.isThisBase = isThisBase;
module.exports.isWorkerEntryThis = isWorkerEntryThis;
