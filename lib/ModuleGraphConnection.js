/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Module")} Module */

class ModuleGraphConnection {
	/**
	 * @param {Module=} originModule the referencing module
	 * @param {Dependency=} dependency the referencing dependency
	 * @param {Module} module the referenced module
	 * @param {string=} explanation some extra detail
	 */
	constructor(originModule, dependency, module, explanation) {
		this.originModule = originModule;
		this.resolvedOriginModule = originModule;
		this.dependency = dependency;
		this.resolvedModule = module;
		this.module = module;
		/** @type {Set<string>} */
		this.explanations = new Set();
		if (explanation) {
			this.explanations.add(explanation);
		}
	}

	/**
	 * @param {string} explanation the explanation to add
	 * @returns {void}
	 */
	addExplanation(explanation) {
		this.explanations.add(explanation);
	}

	get explanation() {
		return Array.from(this.explanations).join(" ");
	}
}

module.exports = ModuleGraphConnection;
