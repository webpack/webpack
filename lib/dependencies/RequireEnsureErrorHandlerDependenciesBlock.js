/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	Modified by Richard Scarrott @richardscarrott
*/
var AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
var RequireEnsureErrorHandlerDependency = require("./RequireEnsureErrorHandlerDependency");

function RequireEnsureErrorHandlerDependenciesBlock(expr, chunkName, module, loc) {
	AsyncDependenciesBlock.call(this, chunkName, module, loc);
	this.expr = expr;
	this.addDependency(new RequireEnsureErrorHandlerDependency(this));
}
module.exports = RequireEnsureErrorHandlerDependenciesBlock;

RequireEnsureErrorHandlerDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);

