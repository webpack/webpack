/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
var AMDRequireDependency = require("./AMDRequireDependency");

function AMDRequireDependenciesBlock(expr, arrayRange, functionRange) {
	AsyncDependenciesBlock.call(this, null);
	this.expr = expr;
	this.range = expr.range;
	this.arrayRange = arrayRange;
	this.functionRange = functionRange;
	this.addDependency(new AMDRequireDependency(this));
}
module.exports = AMDRequireDependenciesBlock;

AMDRequireDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);

