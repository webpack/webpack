/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");
var DepBlockHelpers = require("./DepBlockHelpers");

function RequireEnsureErrorHandlerDependency(block) {
	NullDependency.call(this);
	this.Class = RequireEnsureErrorHandlerDependency;
	this.block = block;
}
module.exports = RequireEnsureErrorHandlerDependency;

RequireEnsureErrorHandlerDependency.prototype = Object.create(NullDependency.prototype);
RequireEnsureErrorHandlerDependency.prototype.type = "require.ensure";

RequireEnsureErrorHandlerDependency.Template = function RequireEnsureErrorHandlerDependencyTemplate() {};

RequireEnsureErrorHandlerDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var depBlock = dep.block;
	var wrapper = DepBlockHelpers.getLoadDepBlockWrapper(depBlock, outputOptions, requestShortener, /*require.e*/"nsure");
	if(!wrapper) wrapper = [
		"!/* require.ensure */(",
		"(__webpack_require__))"
	];
	source.replace(depBlock.expr.range[0], depBlock.expr.arguments[1].range[0]-1, wrapper[0]);
	// maybe use arguments.length - 1?
	// source.replace(depBlock.range[1]+1, depBlock.expr.range[1]-1, wrapper[1]);
	if (depBlock.chunkName) {
		source.replace(depBlock.expr.arguments[depBlock.expr.arguments.length-2].range[1], depBlock.expr.range[1]-1, wrapper[1]);
	} else {
		source.replace(depBlock.expr.arguments[depBlock.expr.arguments.length-1].range[1], depBlock.expr.range[1]-1, wrapper[1]);
	}



	// source.replace(depBlock.expr.range[0], depBlock.expr.arguments[1].range[0]-1, wrapper[0]);
	// source.replace(depBlock.expr.arguments[1].range[1], depBlock.expr.range[1]-1, wrapper[1]);

	// source.replace(depBlock.range[0], depBlock.expr.arguments[1].range[0]-1, wrapper[0]);
	// source.replace(depBlock.expr.arguments[1].range[1], depBlock.expr.range[1]-1, wrapper[1]);
};

