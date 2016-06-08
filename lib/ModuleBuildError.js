/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var loaderFlag = "LOADER_EXECUTION";

function ModuleBuildError(module, err) {
	Error.call(this);
	Error.captureStackTrace(this, ModuleBuildError);
	this.name = "ModuleBuildError";
	this.message = "Module build failed: ";
	if(err !== null && typeof err === "object") {
		if(typeof err.stack === "string" && err.stack) {
			var stack = err.stack.split("\n");
			for(var i = 0; i < stack.length; i++)
				if(stack[i].indexOf(loaderFlag) >= 0)
					stack.length = i;
			stack = stack.join("\n");
			if(!err.hideStack) {
				this.message += stack;
			} else {
				this.details = stack;
				if(typeof err.message === "string" && err.message) {
					this.message += err.message;
				} else {
					this.message += err;
				}
			}
		} else if(typeof err.message === "string" && err.message) {
			this.message += err.message;
		} else {
			this.message += err;
		}
	}
	this.module = module;
	this.error = err;
}
module.exports = ModuleBuildError;

ModuleBuildError.prototype = Object.create(Error.prototype);
ModuleBuildError.prototype.constructor = ModuleBuildError;
