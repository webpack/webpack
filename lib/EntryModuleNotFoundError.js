/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class EntryModuleNotFoundError extends Error {
	constructor(err) {
		super();
		this.name = "EntryModuleNotFoundError";
		this.message = "Entry module not found: " + err;
		this.details = err.details;
		this.error = err;
		Error.captureStackTrace(this, EntryModuleNotFoundError);
	}
}

module.exports = EntryModuleNotFoundError;
