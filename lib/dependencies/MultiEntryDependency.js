/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Dependency = require("../Dependency");

function MultiEntryDependency(dependencies, name) {
	Dependency.call(this);
	this.dependencies = dependencies;
	this.name = name;
}
module.exports = MultiEntryDependency;

MultiEntryDependency.prototype = Object.create(Dependency.prototype);
MultiEntryDependency.prototype.constructor = MultiEntryDependency;
MultiEntryDependency.prototype.type = "multi entry";
