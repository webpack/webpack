/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");

class EntryModuleNotFoundError extends WebpackError {
	constructor(err) {
		super();

		this.name = "EntryModuleNotFoundError";
		this.message = "Entry module not found: " + err;
		this.details = err.details;
		this.error = err;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = EntryModuleNotFoundError;
