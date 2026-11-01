/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const isDependencyKind = require("./isDependencyKind");

/** @import Module from "../module/Module" */
/** @import ModuleGraph from "./ModuleGraph" */

/**
 * Walks the incoming connections of the module for a weak one that reads it.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the module
 * @returns {boolean} true when a weak reference may read the module at runtime
 */
const computeWeaklyReferenced = (moduleGraph, module) => {
	for (const connection of moduleGraph.getIncomingConnections(module)) {
		const dependency = connection.dependency;
		if (
			connection.weak &&
			dependency &&
			// `__webpack_is_included__` only asks whether the module was bundled
			!isDependencyKind(dependency, "is-included")
		) {
			return true;
		}
	}
	return false;
};

/**
 * Whether a weak reference (a weak context, `require.resolveWeak`, a weak `import()`) may read the module at runtime.
 * A module pulled in only for its evaluation stays bundled for such a reference, which finds it only when bundled.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the module
 * @returns {boolean} true when a weak reference may read the module at runtime
 */
const isWeaklyReferenced = (moduleGraph, module) =>
	moduleGraph.cached(computeWeaklyReferenced, module);

module.exports = isWeaklyReferenced;
