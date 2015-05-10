/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
var AMDRequireDependency = require("./AMDRequireDependency");

function AMDRequireDependenciesBlock(expr, arrayRange, functionRange, module, loc) {
	AsyncDependenciesBlock.call(this, null, module, loc);
	this.expr = expr;
	this.outerRange = expr.range;
	this.arrayRange = arrayRange;
	this.functionRange = functionRange;
	this.range = arrayRange && functionRange ? [arrayRange[0], functionRange[1]] :
		arrayRange ? arrayRange :
		functionRange ? functionRange :
		expr.range;
	var dep = new AMDRequireDependency(this);
	dep.loc = loc;
	this.addDependency(dep);
}
module.exports = AMDRequireDependenciesBlock;

AMDRequireDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);

