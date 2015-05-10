/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
var RequireEnsureDependency = require("./RequireEnsureDependency");

function RequireEnsureDependenciesBlock(expr, fnExpression, chunkName, chunkNameRange, module, loc) {
	AsyncDependenciesBlock.call(this, chunkName, module, loc);
	this.expr = expr;
	var bodyRange = fnExpression && fnExpression.body && fnExpression.body.range;
	this.range = bodyRange && [bodyRange[0] + 1, bodyRange[1] - 1] || null;
	this.chunkNameRange = chunkNameRange;
	var dep = new RequireEnsureDependency(this);
	dep.loc = loc;
	this.addDependency(dep);
}
module.exports = RequireEnsureDependenciesBlock;

RequireEnsureDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);

