/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ModuleNotFoundError(module, err) {
	Error.call(this);
	Error.captureStackTrace(this, ModuleNotFoundError);
	this.name = "ModuleNotFoundError";
	this.message = "Module not found: " + err;
	this.details = err.details;
	this.module = module;
	this.error = err;
}
module.exports = ModuleNotFoundError;

ModuleNotFoundError.prototype = Object.create(Error.prototype);
