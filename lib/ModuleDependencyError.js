/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const formatLocation = require("./formatLocation");

module.exports = class ModuleDependencyError extends Error {
	constructor(module, err, loc) {
		super();

		this.name = "ModuleDependencyError";
		this.message = `${formatLocation(loc)} ${err.message}`;
		this.details = err.stack.split("\n").slice(1).join("\n");
		this.origin = this.module = module;
		this.error = err;

		Error.captureStackTrace(this, this.constructor);
	}
};
