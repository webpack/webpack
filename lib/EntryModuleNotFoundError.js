/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function EntryModuleNotFoundError(err) {
	Error.call(this);
	this.name = "EntryModuleNotFoundError";
	this.message = "Entry module not found: " + err;
	this.details = err.details;
	this.error = err;
	Error.captureStackTrace(this, EntryModuleNotFoundError);
}
module.exports = EntryModuleNotFoundError;

EntryModuleNotFoundError.prototype = Object.create(Error.prototype);
EntryModuleNotFoundError.prototype.constructor = EntryModuleNotFoundError;
