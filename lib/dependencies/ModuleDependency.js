/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");

class ModuleDependency extends Dependency {
	constructor(request) {
		super();
		this.request = request;
		this.userRequest = request;
	}

	getResourceIdentifier() {
		return `module${this.request}`;
	}
}

module.exports = ModuleDependency;
