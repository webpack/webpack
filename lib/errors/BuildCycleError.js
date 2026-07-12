/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import WebpackError from "./WebpackError.js";
/** @typedef {import("../Module.js").default} Module */

class BuildCycleError extends WebpackError {
	/**
	 * Creates an instance of BuildCycleError.
	 * @param {Module} module the module starting the cycle
	 */
	constructor(module) {
		super(
			"There is a circular build dependency, which makes it impossible to create this module"
		);

		/** @type {string} */
		this.name = "BuildCycleError";
		/** @type {Module} */
		this.module = module;
	}
}

/** @type {typeof BuildCycleError} */
export default BuildCycleError;

export { BuildCycleError as "module.exports" };
