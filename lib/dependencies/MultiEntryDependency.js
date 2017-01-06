/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");

class MultiEntryDependency extends Dependency {
	constructor(dependencies, name) {
		super();
		this.dependencies = dependencies;
		this.name = name;
	}

	get type() {
		return "multi entry";
	}
}

module.exports = MultiEntryDependency;
