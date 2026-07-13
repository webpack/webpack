/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import WebpackError from "./WebpackError.js";
/** @typedef {import("../Dependency.js").DependencyLocation} DependencyLocation */
/** @typedef {import("../Module.js").default} Module */

class ModuleNotFoundError extends WebpackError {
	/**
	 * Creates an instance of ModuleNotFoundError.
	 * @param {Module | null} module module tied to dependency
	 * @param {Error & { details?: string }} err error thrown
	 * @param {DependencyLocation} loc location of dependency
	 */
	constructor(module, err, loc) {
		super(`Module not found: ${err.toString()}`);

		/** @type {string} */
		this.name = "ModuleNotFoundError";
		/** @type {string | undefined} */
		this.details = err.details;
		/** @type {Module | null} */
		this.module = module;
		this.error = err;
		/** @type {DependencyLocation} */
		this.loc = loc;
	}
}

export default ModuleNotFoundError;

export { ModuleNotFoundError as "module.exports" };
