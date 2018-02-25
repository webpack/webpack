/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");
const cleanUp = require("./ErrorHelpers").cleanUp;

class ModuleError extends WebpackError {
	constructor(module, err) {
		super();

		this.name = "ModuleError";
		this.module = module;
		this.message =
			err && typeof err === "object" && err.message ? err.message : err;
		this.error = err;
		this.details =
			err && typeof err === "object" && err.stack
				? cleanUp(err.stack, this.message)
				: undefined;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleError;
