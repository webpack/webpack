/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @typedef {import("./Module")} Module */

class ModuleNotFoundError extends WebpackError {
	/**
	 * @param {Module} module module tied to dependency
	 * @param {Error&any} err error thrown
	 * @param {TODO} loc location of dependency
	 */
	constructor(module, err, loc) {
		super("Module not found: " + err);

		this.name = "ModuleNotFoundError";
		this.details = err.details;
		this.missing = err.missing;
		this.module = module;
		this.error = err;
		this.loc = loc;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleNotFoundError;
