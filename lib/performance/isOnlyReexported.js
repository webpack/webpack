/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");

/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */

/**
 * Tells whether every module pulling this one in does so by re-exporting it.
 * One an importer wants for its side effects alone is deliberate, not a
 * barrel's leftover.
 * @param {Module} module the module to look up
 * @param {ModuleGraph} moduleGraph the module graph
 * @returns {boolean} true when only re-exports pull it in
 */
const isOnlyReexported = (module, moduleGraph) => {
	// A re-export emits a side-effect edge of its own, so edges are grouped by
	// the statement they come from — `sourceOrder` — rather than by their type.
	/** @type {Map<Module, Set<number | undefined>>} */
	const reexportedStatements = new Map();
	/** @type {[Module, number | undefined][]} */
	const edges = [];

	for (const connection of moduleGraph.getIncomingConnections(module)) {
		const origin = connection.originModule;

		// An entry has no origin: it is in the build because it was asked for.
		if (!origin) return false;

		const dependency = connection.dependency;

		// Only an ESM import statement can carry a re-export.
		if (!(dependency instanceof HarmonyImportDependency)) return false;

		if (dependency instanceof HarmonyExportImportedSpecifierDependency) {
			const statements = reexportedStatements.get(origin);

			if (statements === undefined) {
				reexportedStatements.set(origin, new Set([dependency.sourceOrder]));
			} else {
				statements.add(dependency.sourceOrder);
			}
		}

		edges.push([origin, dependency.sourceOrder]);
	}

	if (edges.length === 0) return false;

	for (const [origin, sourceOrder] of edges) {
		const statements = reexportedStatements.get(origin);

		if (statements === undefined || !statements.has(sourceOrder)) return false;
	}

	return true;
};

module.exports = isOnlyReexported;
