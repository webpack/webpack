/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */

class ModuleGraphConnection {
	/**
	 * @param {Module|undefined} originModule the referencing module
	 * @param {Dependency|undefined} dependency the referencing dependency
	 * @param {Module} module the referenced module
	 * @param {string=} explanation some extra detail
	 * @param {boolean=} weak the reference is weak
	 * @param {function(ModuleGraphConnection, RuntimeSpec): boolean=} condition condition for the connection
	 */
	constructor(
		originModule,
		dependency,
		module,
		explanation,
		weak = false,
		condition = undefined
	) {
		this.originModule = originModule;
		this.resolvedOriginModule = originModule;
		this.dependency = dependency;
		this.resolvedModule = module;
		this.module = module;
		this.weak = weak;
		this.conditional = !!condition;
		this._active = true;
		/** @type {function(ModuleGraphConnection, RuntimeSpec): boolean} */
		this.condition = condition;
		/** @type {Set<string>} */
		this.explanations = undefined;
		if (explanation) {
			this.explanations = new Set();
			this.explanations.add(explanation);
		}
	}

	/**
	 * @param {function(ModuleGraphConnection, RuntimeSpec): boolean} condition condition for the connection
	 * @returns {void}
	 */
	addCondition(condition) {
		if (this.conditional) {
			const old = this.condition;
			this.condition = (c, r) => old(c, r) && condition(c, r);
		} else if (this._active) {
			this.conditional = true;
			this.condition = condition;
		}
	}

	/**
	 * @param {string} explanation the explanation to add
	 * @returns {void}
	 */
	addExplanation(explanation) {
		if (this.explanations === undefined) {
			this.explanations = new Set();
		}
		this.explanations.add(explanation);
	}

	get explanation() {
		if (this.explanations === undefined) return "";
		return Array.from(this.explanations).join(" ");
	}

	// TODO webpack 5 remove
	get active() {
		throw new Error("Use isActive instead");
	}

	/**
	 * @param {RuntimeSpec} runtime the runtime
	 * @returns {boolean} true, if the connection is active
	 */
	isActive(runtime) {
		if (!this.conditional) return this._active;
		return this.condition(this, runtime);
	}

	setActive(value) {
		this.conditional = false;
		this._active = value;
	}

	set active(value) {
		throw new Error("Use setActive instead");
	}
}

module.exports = ModuleGraphConnection;
