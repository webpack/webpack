/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const WebpackError = require("./WebpackError");
const deriveStackFromNestedError = require("./deriveStackFromNestedError");

/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../Module")} Module */
/** @typedef {import("./ModuleBuildError").ErrorWithHideStack} ErrorWithHideStack */

class ModuleDependencyError extends WebpackError {
	/**
	 * Creates an instance of ModuleDependencyError.
	 * @param {Module} module module tied to dependency
	 * @param {ErrorWithHideStack} err error thrown
	 * @param {DependencyLocation} loc location of dependency
	 */
	constructor(module, err, loc) {
		// Deserialization constructs with no arguments, so `err` is absent there.
		super(err ? err.message : "");

		/** @type {string} */
		this.name = "ModuleDependencyError";
		/** @type {Module} */
		this.module = module;
		/** @type {DependencyLocation} */
		this.loc = loc;
		/**
		 * error is not (de)serialized, so it might be undefined after deserialization
		 * @type {ErrorWithHideStack}
		 */
		this.error = err;

		deriveStackFromNestedError(this, err);
	}
}

makeSerializable(
	ModuleDependencyError,
	"webpack/lib/errors/ModuleDependencyError"
);

module.exports = ModuleDependencyError;
