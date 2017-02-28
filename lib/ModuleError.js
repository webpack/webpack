/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class ModuleError extends Error {

	constructor(module, err) {
		super();

		this.name = "ModuleError";
		this.module = module;
		this.message = err;
		this.error = err;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleError;
