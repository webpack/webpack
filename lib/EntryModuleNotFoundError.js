"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class EntryModuleNotFoundError extends Error {
	constructor(error) {
		super();
		this.error = error;
		Error.captureStackTrace(this, EntryModuleNotFoundError);
		this.name = "EntryModuleNotFoundError";
		this.message = `Entry module not found: ${error}`;
		this.details = error.details;
	}
}
module.exports = EntryModuleNotFoundError;
