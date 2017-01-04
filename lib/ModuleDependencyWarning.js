"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class ModuleDependencyWarning extends Error {
	constructor(module, error, loc) {
		super();
		this.module = module;
		this.error = error;
		Error.captureStackTrace(this, ModuleDependencyWarning);
		this.name = "ModuleDependencyWarning";
		this.message = `${loc.start.line}:${loc.start.column} `;
		this.details = error.stack;
		this.message += error.message;
		this.origin = module;
	}
}
module.exports = ModuleDependencyWarning;
