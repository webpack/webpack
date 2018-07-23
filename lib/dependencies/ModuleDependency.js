/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Dependency = require("../Dependency");
const DependencyTemplate = require("../DependencyTemplate");

class ModuleDependency extends Dependency {
	/**
	 * @param {string} request request path which needs resolving
	 */
	constructor(request) {
		super();
		this.request = request;
		this.userRequest = request;
		this.range = undefined;
	}

	getResourceIdentifier() {
		return `module${this.request}`;
	}
}

ModuleDependency.Template = DependencyTemplate;

module.exports = ModuleDependency;
