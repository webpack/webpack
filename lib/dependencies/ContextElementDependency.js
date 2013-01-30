/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function ContextElementDependency(request) {
	ModuleDependency.call(this, request);
	this.Class = ContextElementDependency;
}
module.exports = ContextElementDependency;

ContextElementDependency.prototype = Object.create(ModuleDependency.prototype);
ContextElementDependency.prototype.type = "context element";
