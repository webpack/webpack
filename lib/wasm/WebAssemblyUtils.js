/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");

/** @typedef {import("../Module")} Module */

/** @typedef {Object} UsedWasmDependency
 * @property {WebAssemblyImportDependency} dependency the dependency
 * @property {string} name the export name
 */

const MANGLED_MODULE = "a";

/**
 * @param {Module} module the module
 * @returns {UsedWasmDependency[]} used dependencies and mangled name
 */
const getUsedDependencies = module => {
	/** @type {UsedWasmDependency[]} */
	const array = [];
	let importIndex = 0;
	for (const dep of module.dependencies) {
		if (dep instanceof WebAssemblyImportDependency) {
			if (dep.description.type === "GlobalType" || dep.module === null) {
				continue;
			}

			const importedModule = dep.module;
			const exportName = dep.name;
			const usedName = importedModule && importedModule.isUsed(exportName);
			if (usedName !== false) {
				array.push({
					dependency: dep,
					name: Template.numberToIdentifer(importIndex++)
				});
			}
		}
	}
	return array;
};

exports.getUsedDependencies = getUsedDependencies;
exports.MANGLED_MODULE = MANGLED_MODULE;
