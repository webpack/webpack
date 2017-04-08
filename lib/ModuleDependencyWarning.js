/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");
const formatLocation = require("./formatLocation");

module.exports = class ModuleDependencyWarning extends WebpackError {
	constructor(module, err, loc) {
		super();

		this.name = "ModuleDependencyWarning";
		this.message = `${formatLocation(loc)} ${err.message}`;
		this.details = err.stack.split("\n").slice(1).join("\n");
		this.origin = this.module = module;
		this.error = err;

		Error.captureStackTrace(this, this.constructor);
	}
};
