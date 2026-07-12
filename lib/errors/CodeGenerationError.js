/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import WebpackError from "./WebpackError.js";
/** @typedef {import("../Module.js").default} Module */

class CodeGenerationError extends WebpackError {
	/**
	 * Create a new CodeGenerationError
	 * @param {Module} module related module
	 * @param {Error} error Original error
	 */
	constructor(module, error) {
		super();

		/** @type {string} */
		this.name = "CodeGenerationError";
		/** @type {Module} */
		this.module = module;
		/** @type {Error} */
		this.error = error;
		/** @type {string} */
		this.message = error.message;
		/** @type {string} */
		this.details = error.stack;
	}
}

/** @type {typeof CodeGenerationError} */
export default CodeGenerationError;

export { CodeGenerationError as "module.exports" };
