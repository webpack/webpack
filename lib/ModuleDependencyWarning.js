/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @typedef {import("./Module")} Module */

module.exports = class ModuleDependencyWarning extends WebpackError {
	/**
	 * @param {Module} module module tied to dependency
	 * @param {Error} err error thrown
	 * @param {TODO} loc location of dependency
	 */
	constructor(module, err, loc) {
		super(err.message);

		this.name = "ModuleDependencyWarning";
		this.details = err.stack.split("\n").slice(1).join("\n");
		this.module = module;
		this.loc = loc;
		this.error = err;

		Error.captureStackTrace(this, this.constructor);
	}
};
