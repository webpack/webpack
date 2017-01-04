"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const loaderFlag = "LOADER_EXECUTION";
class ModuleBuildError extends Error {
	constructor(module, err) {
		super();
		this.module = module;
		this.err = err;
		Error.captureStackTrace(this, ModuleBuildError);
		this.name = "ModuleBuildError";
		this.message = "Module build failed: ";
		if(err !== null && typeof err === "object") {
			if(typeof err.stack === "string" && err.stack) {
				let stack = err.stack.split("\n");
				for(let i = 0; i < stack.length; i++) {
					if(stack[i].indexOf(loaderFlag) >= 0) {
						stack.length = i;
					}
				}
				const stackStr = stack.join("\n");
				if(!err.hideStack) {
					this.message += stackStr;
				} else {
					this.details = stackStr;
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
	}
}
module.exports = ModuleBuildError;
