/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function RequireEnsureDependency(block) {
	NullDependency.call(this);
	this.Class = RequireEnsureDependency;
	this.block = block;
}
module.exports = RequireEnsureDependency;

RequireEnsureDependency.prototype = Object.create(NullDependency.prototype);
RequireEnsureDependency.prototype.type = "require.ensure";

RequireEnsureDependency.Template = function RequireEnsureDependencyTemplate() {};

RequireEnsureDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var depBlock = dep.block;
	if(depBlock.chunk && !depBlock.chunk.entry && typeof depBlock.chunk.id === "number") {
		if(depBlock.chunkNameRange) {
			var comment = "";
			if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(depBlock.chunkName) + " */ ";
			source.replace(depBlock.chunkNameRange[0], depBlock.chunkNameRange[1]-1, comment + "0");
		}
		source.replace(depBlock.expr.callee.range[0], depBlock.expr.callee.range[1]-1, "__webpack_require__.e/*nsure*/");
		source.replace(depBlock.expr.arguments[0].range[0], depBlock.expr.arguments[0].range[1]-1, (depBlock.chunk.id) + "" + asComment(depBlock.chunkReason));
	} else {
		source.replace(depBlock.expr.range[0], depBlock.expr.arguments[1].range[0]-1, "!/*require.ensure*/(");
		source.replace(depBlock.expr.arguments[1].range[1], depBlock.expr.range[1]-1, "(__webpack_require__))");
	}
};

function asComment(str) {
	if(!str) return "";
	return "/* " + str + " */";
}
