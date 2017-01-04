"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class ModuleReason {
	constructor(module, dependency) {
		this.module = module;
		this.dependency = dependency;
	}
}
module.exports = ModuleReason;
