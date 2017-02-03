/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class ModuleNotFoundError extends Error {
	constructor(module, err, dependencies) {
		super();
		if(Error.hasOwnProperty("captureStackTrace")) {
			Error.captureStackTrace(this, this.constructor);
		}
		this.name = "ModuleNotFoundError";
		this.message = "Module not found: " + err;
		this.details = err.details;
		this.missing = err.missing;
		this.module = module;
		this.origin = module;
		this.dependencies = dependencies;
		this.error = err;
	}
}

module.exports = ModuleNotFoundError;
