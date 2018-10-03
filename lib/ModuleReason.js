/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Module")} Module */

class ModuleReason {
	/**
	 * @param {Module} module the referencing module
	 * @param {Dependency} dependency the referencing dependency
	 * @param {string=} explanation some extra detail
	 */
	constructor(module, dependency, explanation) {
		this.module = module;
		this.dependency = dependency;
		this.explanation = explanation;
	}
}

module.exports = ModuleReason;
