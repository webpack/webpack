/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function CriticalDependenciesWarning(module, dependencies) {
	Error.call(this);
	Error.captureStackTrace(this, CriticalDependenciesWarning);
	this.name = "CriticalDependenciesWarning";
	this.message = "Critical dependencies.";
	this.dependencies = dependencies;
	this.origin = this.module = module;
}
module.exports = CriticalDependenciesWarning;

CriticalDependenciesWarning.prototype = Object.create(Error.prototype);
