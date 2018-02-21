/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");
const cleanUp = require("./ErrorHelpers").cleanUp;

class ModuleWarning extends WebpackError {
	constructor(module, warning, from) {
		super();

		this.name = "ModuleWarning";
		this.module = module;
		this.message = "Module Warning";
		if(from) {
			this.message += ` (from ${from})`;
		}
		this.message += ": ";
		this.message += warning && typeof warning === "object" && warning.message ? warning.message : warning;
		this.warning = warning;
		this.details = warning && typeof warning === "object" && warning.stack ? cleanUp(warning.stack, this.message) : undefined;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleWarning;
