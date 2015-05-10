/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Dependency = require("../Dependency");

function ModuleDependency(request) {
	Dependency.call(this);
	this.request = request;
	this.userRequest = request;
	this.Class = ModuleDependency;
}
module.exports = ModuleDependency;

ModuleDependency.prototype = Object.create(Dependency.prototype);
ModuleDependency.prototype.constructor = ModuleDependency;
ModuleDependency.prototype.isEqualResource = function isEqualResource(other) {
	if(!(other instanceof ModuleDependency))
		return false;
	return this.request === other.request;
};
