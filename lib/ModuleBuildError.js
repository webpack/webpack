/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const loaderFlag = "LOADER_EXECUTION";

class ModuleBuildError extends Error {

	constructor(module, err) {
		super();
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
		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleBuildError;
