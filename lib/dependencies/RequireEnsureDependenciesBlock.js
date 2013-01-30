/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
var RequireEnsureDependency = require("./RequireEnsureDependency");

function RequireEnsureDependenciesBlock(expr, chunkName, chunkNameRange) {
	AsyncDependenciesBlock.call(this);
	this.expr = expr;
	var bodyRange = expr.arguments[1].body.range;
	this.range = [bodyRange[0] + 1, bodyRange[1] - 1];
	this.chunkName = chunkName;
	this.chunkNameRange = chunkNameRange;
	this.addDependency(new RequireEnsureDependency(this));
}
module.exports = RequireEnsureDependenciesBlock;

RequireEnsureDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);

