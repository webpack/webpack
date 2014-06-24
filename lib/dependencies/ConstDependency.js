/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function ConstDependency(expression, range) {
	NullDependency.call(this);
	this.Class = ConstDependency;
	this.expression = expression;
	this.range = range;
}
module.exports = ConstDependency;

ConstDependency.prototype = Object.create(NullDependency.prototype);

ConstDependency.Template = function ConstDependencyTemplate() {};

ConstDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	if(typeof dep.range === "number")
		source.insert(dep.range, dep.expression);
	else
		source.replace(dep.range[0], dep.range[1]-1, dep.expression);
};
