/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var formatLocation = require("./formatLocation");

function ModuleDependencyError(module, err, loc) {
	Error.call(this);
	Error.captureStackTrace(this, ModuleDependencyError);
	this.name = "ModuleDependencyError";
	this.message = formatLocation(loc) + " ";
	this.details = err.stack;
	this.message += err.message;
	this.origin = this.module = module;
	this.error = err;
}
module.exports = ModuleDependencyError;

ModuleDependencyError.prototype = Object.create(Error.prototype);
ModuleDependencyError.prototype.constructor = ModuleDependencyError;
