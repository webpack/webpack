/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");

class ModuleNotFoundError extends WebpackError {
	constructor(module, err, dependencies) {
		super();

		this.name = "ModuleNotFoundError";
		this.message = "Module not found: " + err;
		this.details = err.details;
		this.missing = err.missing;
		this.module = module;
		this.origin = module;
		this.dependencies = dependencies;
		this.error = err;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleNotFoundError;
