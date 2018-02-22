/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");
const cleanUp = require("./ErrorHelpers").cleanUp;

class ModuleError extends WebpackError {
	constructor(module, err, from) {
		super();

		this.name = "ModuleError";
		this.module = module;
		this.message = "Module Error";
		if(from) {
			this.message += ` (@ ${from})`;
		}
		if(err && typeof err === "object" && err.message) {
			this.message += `: ${err.message}`;
		} else if(err) {
			this.message += `: ${err}`;
		}
		this.error = err;
		this.details = err && typeof err === "object" && err.stack ? cleanUp(err.stack, this.message) : undefined;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleError;
