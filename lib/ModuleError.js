/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ModuleError(module, err) {
	Error.call(this);
	Error.captureStackTrace(this, ModuleError);
	// todo: some other class use string properties in prototype, but here is not
	this.name = "ModuleError";
	this.module = module;
	this.message = err;
	this.error = err;
}
module.exports = ModuleError;

ModuleError.prototype = Object.create(Error.prototype);
ModuleError.prototype.constructor = ModuleError;
