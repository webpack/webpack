/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");

/** @import ModuleGraph from "../ModuleGraph" */
/** @import Module from "../Module" */

/** @typedef {Set<Module>} Modules */

/**
 * Gets outgoing async modules.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {Module} module module
 * @returns {Modules} set of modules
 */
const getOutgoingAsyncModules = (moduleGraph, module) => {
	/** @type {Modules} */
	const set = new Set();
	/** @type {Modules} */
	const seen = new Set();
	(function g(module) {
		if (!moduleGraph.isAsync(module) || seen.has(module)) return;
		seen.add(module);
		if (module.buildMeta && module.buildMeta.async) {
			set.add(module);
		} else {
			const outgoingConnectionMap =
				moduleGraph.getOutgoingConnectionsByModule(module);
			if (outgoingConnectionMap) {
				// Walk the imports in source order: the spec gathers these from
				// `[[RequestedModules]]`, and their evaluation order is observable.
				for (const dependency of module.dependencies) {
					if (!(dependency instanceof HarmonyImportDependency)) continue;
					const referenced = moduleGraph.getModule(dependency);
					if (!referenced || seen.has(referenced)) continue;
					const connections = outgoingConnectionMap.get(referenced);
					if (
						connections &&
						connections.some(
							(c) =>
								c.dependency instanceof HarmonyImportDependency &&
								c.isTargetActive(undefined)
						)
					) {
						g(referenced);
					}
				}
			}
		}
	})(module);
	return set;
};

module.exports.getOutgoingAsyncModules = getOutgoingAsyncModules;
