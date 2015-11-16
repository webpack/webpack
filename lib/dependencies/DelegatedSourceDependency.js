/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function DelegatedSourceDependency(request) {
	ModuleDependency.call(this, request);
}
module.exports = DelegatedSourceDependency;

DelegatedSourceDependency.prototype = Object.create(ModuleDependency.prototype);
DelegatedSourceDependency.prototype.constructor = DelegatedSourceDependency;
DelegatedSourceDependency.prototype.type = "delegated source";
