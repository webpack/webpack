/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");

/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../Module")} Module */

/**
 * @param {ModuleGraph} moduleGraph module graph
 * @param {Module} module module
 * @returns {Set<Module>} set of modules
 */
const getOutgoingAsyncModules = (moduleGraph, module) => {
	/** @type {Set<Module>} */
	const set = new Set();
	/** @type {Set<Module>} */
	const seen = new Set();
	(function g(/** @type {Module} */ module) {
		if (!moduleGraph.isAsync(module) || seen.has(module)) return;
		seen.add(module);
		if (module.buildMeta && module.buildMeta.async) {
			set.add(module);
		} else {
			const outgoingConnectionMap =
				moduleGraph.getOutgoingConnectionsByModule(module);
			if (outgoingConnectionMap) {
				for (const [module, connections] of outgoingConnectionMap) {
					if (
						connections.some(
							c =>
								c.dependency instanceof HarmonyImportDependency &&
								c.isTargetActive(undefined)
						) &&
						module
					) {
						g(module);
					}
				}
			}
		}
	})(module);
	return set;
};

module.exports.getOutgoingAsyncModules = getOutgoingAsyncModules;
