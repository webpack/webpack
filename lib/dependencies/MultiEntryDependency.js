"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const Dependency = require("../Dependency");
class MultiEntryDependency extends Dependency {
	constructor(dependencies, name) {
		super();
		this.dependencies = dependencies;
		this.name = name;
	}
}
MultiEntryDependency.prototype.type = "multi entry";
module.exports = MultiEntryDependency;
