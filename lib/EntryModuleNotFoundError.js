/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function EntryModuleNotFoundError(err) {
	Error.call(this);
	Error.captureStackTrace(this, EntryModuleNotFoundError);
	this.name = "EntryModuleNotFoundError";
	this.message = "Entry module not found: " + err;
	this.details = err.details;
	this.error = err;
}
module.exports = EntryModuleNotFoundError;

EntryModuleNotFoundError.prototype = Object.create(Error.prototype);
