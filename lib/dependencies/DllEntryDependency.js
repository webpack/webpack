"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const Dependency = require("../Dependency");
class DllEntryDependency extends Dependency {
	constructor(dependencies, name, type) {
		super();
		this.dependencies = dependencies;
		this.name = name;
		this.type = type;
	}
}
DllEntryDependency.prototype.type = "dll entry";
module.exports = DllEntryDependency;
