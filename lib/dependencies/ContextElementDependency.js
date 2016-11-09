/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function ContextElementDependency(request, userRequest) {
	ModuleDependency.call(this, request);
	if(userRequest) {
		this.userRequest = userRequest;
	}
}
module.exports = ContextElementDependency;

ContextElementDependency.prototype = Object.create(ModuleDependency.prototype);
ContextElementDependency.prototype.constructor = ContextElementDependency;
ContextElementDependency.prototype.type = "context element";
