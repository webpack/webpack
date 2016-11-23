/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ModuleWarning(module, warning) {
	Error.call(this);
	Error.captureStackTrace(this, ModuleWarning);
	this.name = "ModuleWarning";
	this.module = module;
	this.message = warning;
	this.warning = warning;
}
module.exports = ModuleWarning;

ModuleWarning.prototype = Object.create(Error.prototype);
ModuleWarning.prototype.constructor = ModuleWarning;
