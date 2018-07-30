/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { cleanUp } = require("./ErrorHelpers");
const WebpackError = require("./WebpackError");

class ModuleError extends WebpackError {
	constructor(module, err, { from = null } = {}) {
		let message = "Module Error";
		if (from) {
			message += ` (from ${from}):\n`;
		} else {
			message += ": ";
		}
		if (err && typeof err === "object" && err.message) {
			message += err.message;
		} else if (err) {
			message += err;
		}
		super(message);
		this.name = "ModuleError";
		this.module = module;
		this.error = err;
		this.details =
			err && typeof err === "object" && err.stack
				? cleanUp(err.stack, this.message)
				: undefined;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleError;
