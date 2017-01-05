/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");

class NullDependency extends Dependency {
	constructor() {
		super();
	}

	get type() {
		return "null";
	}

	isEqualResource() {
		return false;
	}
}

module.exports = NullDependency;
