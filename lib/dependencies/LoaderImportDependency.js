/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ModuleDependency from "./ModuleDependency.js";
/** @typedef {import("../Dependency.js").GetConditionFn} GetConditionFn */
/** @typedef {import("../ModuleGraph.js").default} ModuleGraph */

class LoaderImportDependency extends ModuleDependency {
	/**
	 * Creates an instance of LoaderImportDependency.
	 * @param {string} request request string
	 */
	constructor(request) {
		super(request);
		/** @type {boolean} */
		this.weak = true;
	}

	get type() {
		return "loader import";
	}

	get category() {
		return "loaderImport";
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

export default LoaderImportDependency;

export { LoaderImportDependency as "module.exports" };
