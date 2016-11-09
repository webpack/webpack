/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function CriticalDependenciesWarning(module, dependencies) {
	Error.call(this);
	Error.captureStackTrace(this, CriticalDependenciesWarning);
	this.name = "CriticalDependenciesWarning";
	this.message = "Critical dependencies:";
	this.message += dependencies.filter(function(d) {
		return typeof d.critical === "string" || d.loc;
	}).map(function(dep) {
		var line = [];
		if(dep.loc) line.push(dep.loc.start.line + ":" + dep.loc.start.column + "-" +
			(dep.loc.start.line !== dep.loc.end.line ? dep.loc.end.line + ":" : "") + dep.loc.end.column);
		if(typeof dep.critical === "string") line.push(dep.critical);
		return "\n" + line.join(" ");
	}).join("");
	this.dependencies = dependencies;
	this.origin = this.module = module;
}
module.exports = CriticalDependenciesWarning;

CriticalDependenciesWarning.prototype = Object.create(Error.prototype);
