/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./Module")} Module */

class ModuleDependencyError extends WebpackError {
	/**
	 * Creates an instance of ModuleDependencyError.
	 * @param {Module} module module tied to dependency
	 * @param {Error} err error thrown
	 * @param {DependencyLocation} loc location of dependency
	 */
	constructor(module, err, loc) {
		super(err.message);

		this.name = "ModuleDependencyError";
		this.details =
			err && !(/** @type {any} */ (err).hideStack)
				? err.stack.split("\n").slice(1).join("\n")
				: undefined;
		this.module = module;
		this.loc = loc;
		/** error is not (de)serialized, so it might be undefined after deserialization */
		this.error = err;

		if (err && /** @type {any} */ (err).hideStack) {
			this.stack =
				err.stack.split("\n").slice(1).join("\n") + "\n\n" + this.stack;
		}
	}
}

module.exports = ModuleDependencyError;
