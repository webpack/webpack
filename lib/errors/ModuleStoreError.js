/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import WebpackError from "./WebpackError.js";
/** @typedef {import("../Module.js").default} Module */

class ModuleStoreError extends WebpackError {
	/**
	 * Creates an instance of ModuleStoreError.
	 * @param {Module} module module tied to dependency
	 * @param {string | Error} err error thrown
	 */
	constructor(module, err) {
		let message = "Module storing failed: ";
		/** @type {string | undefined} */
		const details = undefined;
		if (err !== null && typeof err === "object") {
			if (typeof err.stack === "string" && err.stack) {
				const stack = err.stack;
				message += stack;
			} else if (typeof err.message === "string" && err.message) {
				message += err.message;
			} else {
				message += err;
			}
		} else {
			message += String(err);
		}

		super(message);

		/** @type {string} */
		this.name = "ModuleStoreError";
		/** @type {string | undefined} */
		this.details = /** @type {string | undefined} */ (details);
		/** @type {Module} */
		this.module = module;
		/** @type {string | Error} */
		this.error = err;
	}
}

/** @type {typeof ModuleStoreError} */
export default ModuleStoreError;

export { ModuleStoreError as "module.exports" };
