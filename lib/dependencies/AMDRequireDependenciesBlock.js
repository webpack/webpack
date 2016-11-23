/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
var AMDRequireDependency = require("./AMDRequireDependency");

function AMDRequireDependenciesBlock(expr, arrayRange, functionRange, errorCallbackRange, module, loc) {
	AsyncDependenciesBlock.call(this, null, module, loc);
	this.expr = expr;
	this.outerRange = expr.range;
	this.arrayRange = arrayRange;
	this.functionRange = functionRange;
	this.errorCallbackRange = errorCallbackRange;
	this.bindThis = true;
	if(arrayRange && functionRange && errorCallbackRange) {
		this.range = [arrayRange[0], errorCallbackRange[1]];
	} else if(arrayRange && functionRange) {
		this.range = [arrayRange[0], functionRange[1]];
	} else if(arrayRange) {
		this.range = arrayRange;
	} else if(functionRange) {
		this.range = functionRange;
	} else {
		this.range = expr.range;
	}
	var dep = new AMDRequireDependency(this);
	dep.loc = loc;
	this.addDependency(dep);
}
module.exports = AMDRequireDependenciesBlock;

AMDRequireDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);
AMDRequireDependenciesBlock.prototype.constructor = AMDRequireDependenciesBlock;
