/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");
const cleanUp = require("./ErrorHelpers").cleanUp;

class ModuleWarning extends WebpackError {
	constructor(module, warning) {
		super();

		this.name = "ModuleWarning";
		this.module = module;
		this.message = "Module warning";
		if(warning !== null && typeof warning === "object") {
			if(warning.from) {
				this.message += ("(from " + warning.from + ")");
			}
			this.message += ": ";
			if(warning.message) {
				this.message += warning.message;
			}
			if(warning.stack) {
				this.details = cleanUp(warning.stack, this.message);
			}
		} else {
			this.message += ": ";
			this.message += warning;
		}
		this.warning = warning;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleWarning;
