/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module")} Module */

/**
 * @param {Iterable<Module>} modules the modules
 * @param {Compilation} compilation the compilation
 * @returns {function(Module): void} function which assigns an id to a module
 */
const assignAscendingModuleIds = (modules, compilation) => {
	const chunkGraph = compilation.chunkGraph;

	const usedIds = new Set();
	if (compilation.usedModuleIds) {
		for (const id of compilation.usedModuleIds) {
			usedIds.add(id);
		}
	}

	for (const module of modules) {
		const moduleId = chunkGraph.getModuleId(module);
		if (moduleId !== null) {
			usedIds.add(moduleId);
		}
	}

	let nextId = 0;
	let assignId;
	if (usedIds.size > 0) {
		assignId = module => {
			if (chunkGraph.getModuleId(module) === null) {
				while (usedIds.has(nextId)) nextId++;
				chunkGraph.setModuleId(module, nextId++);
			}
		};
	} else {
		assignId = module => {
			if (chunkGraph.getModuleId(module) === null) {
				chunkGraph.setModuleId(module, nextId++);
			}
		};
	}
	for (const module of modules) {
		assignId(module);
	}
	return assignId;
};

module.exports = assignAscendingModuleIds;
