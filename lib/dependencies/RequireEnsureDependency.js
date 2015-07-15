/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");
var DepBlockHelpers = require("./DepBlockHelpers");

function RequireEnsureDependency(block) {
	NullDependency.call(this);
	this.Class = RequireEnsureDependency;
	this.block = block;
}
module.exports = RequireEnsureDependency;

RequireEnsureDependency.prototype = Object.create(NullDependency.prototype);
RequireEnsureDependency.prototype.constructor = RequireEnsureDependency;
RequireEnsureDependency.prototype.type = "require.ensure";

RequireEnsureDependency.Template = function RequireEnsureDependencyTemplate() {};

RequireEnsureDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var depBlock = dep.block;
	var wrapper = DepBlockHelpers.getLoadDepBlockWrapper(depBlock, outputOptions, requestShortener, /*require.e*/ "nsure");
	if(!wrapper) wrapper = [
		"!/* require.ensure */(",
		"(__webpack_require__))"
	];
	source.replace(depBlock.expr.range[0], depBlock.expr.arguments[1].range[0] - 1, wrapper[0]);
	source.replace(depBlock.expr.arguments[1].range[1], depBlock.expr.range[1] - 1, wrapper[1]);
};
