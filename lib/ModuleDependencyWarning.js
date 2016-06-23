/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ModuleDependencyWarning(module, err, loc) {
	Error.call(this);
	Error.captureStackTrace(this, ModuleDependencyWarning);
	this.name = "ModuleDependencyWarning";
	this.message = loc.start.line + ":" + loc.start.column + " ";
	this.details = err.stack;
	this.message += err.message;
	this.origin = this.module = module;
	this.error = err;
}
module.exports = ModuleDependencyWarning;

ModuleDependencyWarning.prototype = Object.create(Error.prototype);
ModuleDependencyWarning.prototype.constructor = ModuleDependencyWarning;
