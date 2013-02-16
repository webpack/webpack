/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ModuleParseError(module, source, err) {
	Error.call(this);
	Error.captureStackTrace(this, ModuleParseError);
	this.name = "ModuleParseError";
	this.message = "Module parse failed: " + module.request + " " + err.message;
	if(typeof err.lineNumber === "number") {
		source = source.split("\n");
		this.message += "\n" + source.slice(err.lineNumber - 2, 5).join("\n");
	} else {
		this.message += "\n" + err.stack;
	}
	this.module = module;
	this.error = err;
}
module.exports = ModuleParseError;

ModuleParseError.prototype = Object.create(Error.prototype);
