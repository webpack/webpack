/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");
const CriticalDependencyWarning = require("./CriticalDependencyWarning");

function equalRegExp(a, b) {
	if(a === b) return true;
	if(typeof a !== "object" || typeof b !== "object") return false;
	return a + "" === b + "";
}

class ContextDependency extends Dependency {
	// options: { request, recursive, regExp, include, exclude, async, chunkName }
	constructor(options) {
		super();
		this.options = options;
		this.userRequest = this.options.request;
		this.hadGlobalOrStickyRegExp = false;
		if(this.options.regExp.global || this.options.regExp.sticky) {
			this.options.regExp = null;
			this.hadGlobalOrStickyRegExp = true;
		}
	}

	isEqualResource(other) {
		if(!(other instanceof ContextDependency))
			return false;

		return this.options.request === other.options.request &&
			this.options.recursive === other.options.recursive &&
			equalRegExp(this.options.regExp, other.options.regExp) &&
			equalRegExp(this.options.include, other.options.include) &&
			equalRegExp(this.options.exclude, other.options.exclude) &&
			this.options.async === other.options.async &&
			this.options.chunkName === other.options.chunkName;
	}

	getWarnings() {
		let warnings = super.getWarnings() || [];
		if(this.critical) {
			warnings.push(new CriticalDependencyWarning(this.critical));
		}
		if(this.hadGlobalOrStickyRegExp) {
			warnings.push(new CriticalDependencyWarning("Contexts can't use RegExps with the 'g' or 'y' flags."));
		}
		return warnings;
	}
}

Object.defineProperty(ContextDependency.prototype, "async", {
	configurable: false,
	get() {
		throw new Error("ContextDependency.async was removed. Pass options to constructor instead");
	},
	set() {
		throw new Error("ContextDependency.async was removed. Pass options to constructor instead");
	}
});

module.exports = ContextDependency;
