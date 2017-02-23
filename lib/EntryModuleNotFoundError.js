/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class EntryModuleNotFoundError extends Error {
	constructor(err) {
		super();

		if(Error.hasOwnProperty("captureStackTrace")) {
			Error.captureStackTrace(this, this.constructor);
		}

		this.name = "EntryModuleNotFoundError";
		this.message = "Entry module not found: " + err;
		this.details = err.details;
		this.error = err;
	}
}
module.exports = EntryModuleNotFoundError;
