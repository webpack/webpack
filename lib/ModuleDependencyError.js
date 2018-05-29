/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");
const formatLocation = require("./formatLocation");

/** @typedef {import("./Module")} Module */

class ModuleDependencyError extends WebpackError {
	/**
	 * Creates an instance of ModuleDependencyError.
	 * @param {Module} module module tied to dependency
	 * @param {Error} err error thrown
	 * @param {TODO} loc location of dependency
	 */
	constructor(module, err, loc) {
		super();

		this.name = "ModuleDependencyError";
		this.message = `${formatLocation(loc)} ${err.message}`;
		this.details = err.stack
			.split("\n")
			.slice(1)
			.join("\n");
		this.origin = this.module = module;
		this.error = err;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleDependencyError;
