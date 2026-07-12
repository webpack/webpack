/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import WebpackError from "./WebpackError.js";
/** @typedef {import("../Module.js").default} Module */

class ModuleHashingError extends WebpackError {
	/**
	 * Create a new ModuleHashingError
	 * @param {Module} module related module
	 * @param {Error} error Original error
	 */
	constructor(module, error) {
		super();

		/** @type {string} */
		this.name = "ModuleHashingError";
		/** @type {Error} */
		this.error = error;
		/** @type {string} */
		this.message = error.message;
		/** @type {string | undefined} */
		this.details = error.stack;
		/** @type {Module} */
		this.module = module;
	}
}

/** @type {typeof ModuleHashingError} */
export default ModuleHashingError;

export { ModuleHashingError as "module.exports" };
