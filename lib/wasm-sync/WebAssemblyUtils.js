/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");
const Template = require("../template/Template");

/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */

/**
 * Defines the used wasm dependency type used by this module.
 * @typedef {object} UsedWasmDependency
 * @property {WebAssemblyImportDependency} dependency the dependency
 * @property {string} name the export name
 * @property {string} module the module name
 */

const MANGLED_MODULE = "a";

/**
 * Gets used dependencies.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the module
 * @param {boolean | undefined} mangle mangle module and export names
 * @returns {UsedWasmDependency[]} used dependencies and (mangled) name
 */
const getUsedDependencies = (moduleGraph, module, mangle) => {
	/** @type {UsedWasmDependency[]} */
	const array = [];
	let importIndex = 0;
	for (const dep of module.dependencies) {
		if (dep instanceof WebAssemblyImportDependency) {
			if (
				dep.description.type === "GlobalType" ||
				moduleGraph.getModule(dep) === null
			) {
				continue;
			}

			const exportName = dep.name;
			// TODO once ModuleExport can be removed, skip a dependency whose
			// imported module reports `getUsedName(exportName, runtime) === false`.
			if (mangle) {
				array.push({
					dependency: dep,
					name: Template.numberToIdentifier(importIndex++),
					module: MANGLED_MODULE
				});
			} else {
				array.push({
					dependency: dep,
					name: exportName,
					module: dep.request
				});
			}
		}
	}
	return array;
};

module.exports.MANGLED_MODULE = MANGLED_MODULE;
module.exports.getUsedDependencies = getUsedDependencies;
