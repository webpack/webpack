/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function RequireHeaderDependency(range) {
	if(!Array.isArray(range)) throw new Error("range must be valid");
	NullDependency.call(this);
	this.Class = RequireHeaderDependency;
	this.range = range;
}
module.exports = RequireHeaderDependency;

RequireHeaderDependency.prototype = Object.create(NullDependency.prototype);
RequireHeaderDependency.prototype.constructor = RequireHeaderDependency;

RequireHeaderDependency.Template = function RequireHeaderDependencyTemplate() {};

RequireHeaderDependency.Template.prototype.apply = function(dep, source) {
	source.replace(dep.range[0], dep.range[1] - 1, "__webpack_require__");
};

RequireHeaderDependency.Template.prototype.applyAsTemplateArgument = function(name, dep, source) {
	source.replace(dep.range[0], dep.range[1] - 1, "require");
};
