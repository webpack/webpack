/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ModuleDependency from "./ModuleDependency.js";

class PrefetchDependency extends ModuleDependency {
	/**
	 * Creates an instance of PrefetchDependency.
	 * @param {string} request the request string
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "prefetch";
	}

	get category() {
		return "esm";
	}
}

export default PrefetchDependency;

export { PrefetchDependency as "module.exports" };
