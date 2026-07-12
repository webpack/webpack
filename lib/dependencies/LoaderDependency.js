/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ModuleDependency from "./ModuleDependency.js";
/** @typedef {import("../Dependency.js").GetConditionFn} GetConditionFn */
/** @typedef {import("../ModuleGraph.js").default} ModuleGraph */

class LoaderDependency extends ModuleDependency {
	/**
	 * Creates an instance of LoaderDependency.
	 * @param {string} request request string
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "loader";
	}

	get category() {
		return "loader";
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		return false;
	}
}

export default LoaderDependency;

export { LoaderDependency as "module.exports" };
