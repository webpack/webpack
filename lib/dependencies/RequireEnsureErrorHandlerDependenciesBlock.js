/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
var RequireEnsureErrorHandlerDependency = require("./RequireEnsureErrorHandlerDependency");

function RequireEnsureDependenciesBlock(expr, successCallback, errorCallback, chunkName, chunkNameRange, module, loc) {
	AsyncDependenciesBlock.call(this, chunkName, module, loc);
	this.expr = expr;
	var successCallbackRange = successCallback && successCallback.body && successCallback.body.range;
	var errorCallbackRange = errorCallback && errorCallback.body && errorCallback.body.range;
	this.range = null;
	if (errorCallback) {
		debugger;
	}
	if (successCallbackRange && errorCallbackRange) {
		this.range = [successCallbackRange[0] + 1, errorCallbackRange[1] - 1];
	} else if (successCallbackRange) {
		this.range = [successCallbackRange[0] + 1, successCallbackRange[1] - 1];
	}
	this.chunkNameRange = chunkNameRange;
	this.addDependency(new RequireEnsureErrorHandlerDependency(this));
}
module.exports = RequireEnsureDependenciesBlock;

RequireEnsureDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);

