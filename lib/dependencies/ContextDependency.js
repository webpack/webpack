/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Dependency = require("../Dependency");

function ContextDependency(request, recursive, regExp) {
	Dependency.call(this);
	this.request = request;
	this.userRequest = request;
	this.recursive = recursive;
	this.regExp = regExp;
	this.Class = ContextDependency;
}
module.exports = ContextDependency;

ContextDependency.prototype = Object.create(Dependency.prototype);
ContextDependency.prototype.isEqualResource = function(other) {
	if(!(other instanceof ContextDependency))
		return false;
	return this.request === other.request &&
		this.recursive === other.recursive &&
		this.regExp === other.regExp;
};
