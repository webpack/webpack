/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Dependency = require("../Dependency");

function DllEntryDependency(dependencies, name, type) {
	Dependency.call(this);
	this.Class = DllEntryDependency;
	this.dependencies = dependencies;
	this.name = name;
	this.type = type;
}
module.exports = DllEntryDependency;

DllEntryDependency.prototype = Object.create(Dependency.prototype);
DllEntryDependency.prototype.constructor = DllEntryDependency;
DllEntryDependency.prototype.type = "dll entry";
