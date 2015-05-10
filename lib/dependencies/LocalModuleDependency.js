/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function LocalModuleDependency(localModule, range) {
	NullDependency.call(this);
	this.Class = LocalModuleDependency;
	localModule.flagUsed();
	this.localModule = localModule;
	this.range = range;
}
module.exports = LocalModuleDependency;

LocalModuleDependency.prototype = Object.create(NullDependency.prototype);
LocalModuleDependency.prototype.constructor = LocalModuleDependency;

LocalModuleDependency.Template = function LocalModuleDependencyTemplate() {};

LocalModuleDependency.Template.prototype.apply = function(dep, source) {
	if(!dep.range) return;
	source.replace(dep.range[0], dep.range[1] - 1, dep.localModule.variableName());
};
