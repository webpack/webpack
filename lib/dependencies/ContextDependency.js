/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");

class ContextDependency extends Dependency {
	constructor(request, recursive, regExp) {
		super();
		this.request = request;
		this.userRequest = request;
		this.recursive = recursive;
		this.regExp = regExp;
		this.async = false;
	}

	isEqualResource(other) {
		if(!(other instanceof ContextDependency))
			return false;

		return this.request === other.request &&
			this.recursive === other.recursive &&
			this.regExp === other.regExp &&
			this.async === other.async;
	}
}

module.exports = ContextDependency;
