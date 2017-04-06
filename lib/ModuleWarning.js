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
		this.message = warning && typeof warning === "object" && warning.message ? warning.message : warning;
		this.warning = warning;
		this.details = warning && typeof warning === "object" && warning.stack ? cleanUp(warning.stack, this.message) : undefined;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleWarning;
