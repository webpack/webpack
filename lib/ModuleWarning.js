"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class ModuleWarning extends Error {
	constructor(module, warning) {
		super();
		this.module = module;
		this.warning = warning;
		Error.captureStackTrace(this, ModuleWarning);
		this.name = "ModuleWarning";
		this.message = warning;
	}
}
module.exports = ModuleWarning;
