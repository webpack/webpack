"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class ModuleNotFoundError extends Error {
	constructor(module, err, dependencies) {
		super();
		this.module = module;
		this.err = err;
		this.dependencies = dependencies;
		Error.captureStackTrace(this, ModuleNotFoundError);
		this.name = "ModuleNotFoundError";
		this.message = `Module not found: ${err}`;
		this.details = err.details;
		this.missing = err.missing;
		this.origin = module;
	}
}
module.exports = ModuleNotFoundError;
