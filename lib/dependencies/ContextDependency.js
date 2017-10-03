/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");
const CriticalDependencyWarning = require("./CriticalDependencyWarning");

class ContextDependency extends Dependency {
	constructor(request, recursive, regExp) {
		super();
		this.request = request;
		this.userRequest = request;
		this.recursive = recursive;
		this.regExp = regExp;
		this.async = false;

		this.hadGlobalOrStickyRegExp = false;
		if(this.regExp.global || this.regExp.sticky) {
			this.regExp = null;
			this.hadGlobalOrStickyRegExp = true;
		}

	}

	isEqualResource(other) {
		if(!(other instanceof ContextDependency))
			return false;

		return this.request === other.request &&
			this.recursive === other.recursive &&
			this.regExp === other.regExp &&
			this.async === other.async;
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

module.exports = ContextDependency;
