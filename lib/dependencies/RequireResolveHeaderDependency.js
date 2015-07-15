/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function RequireResolveHeaderDependency(range) {
	if(!Array.isArray(range)) throw new Error("range must be valid");
	NullDependency.call(this);
	this.Class = RequireResolveHeaderDependency;
	this.range = range;
}
module.exports = RequireResolveHeaderDependency;

RequireResolveHeaderDependency.prototype = Object.create(NullDependency.prototype);
RequireResolveHeaderDependency.prototype.constructor = RequireResolveHeaderDependency;

RequireResolveHeaderDependency.Template = function RequireResolveHeaderDependencyTemplate() {};

RequireResolveHeaderDependency.Template.prototype.apply = function(dep, source) {
	source.replace(dep.range[0], dep.range[1] - 1, "/*require.resolve*/");
};

RequireResolveHeaderDependency.Template.prototype.applyAsTemplateArgument = function(name, dep, source) {
	source.replace(dep.range[0], dep.range[1] - 1, "/*require.resolve*/");
};
