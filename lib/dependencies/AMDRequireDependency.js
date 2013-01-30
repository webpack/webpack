/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function AMDRequireDependency(block) {
	NullDependency.call(this);
	this.Class = AMDRequireDependency;
	this.block = block;
}
module.exports = AMDRequireDependency;

AMDRequireDependency.prototype = Object.create(NullDependency.prototype);

AMDRequireDependency.Template = function AMDRequireDependencyTemplate() {};

AMDRequireDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var depBlock = dep.block;
	if(depBlock.arrayRange && !depBlock.functionRange) {
		source.replace(depBlock.range[0], depBlock.arrayRange[0]-1, 
			"require.e/* require */(" + (depBlock.chunk && depBlock.chunk.id || 0) + asComment(depBlock.chunkReason) + ", function(require) {");
		source.replace(depBlock.arrayRange[1], depBlock.range[1]-1, ";})");
	} else if(!depBlock.arrayRange && depBlock.functionRange) {
		source.replace(depBlock.range[0], depBlock.functionRange[0]-1, 
			"require.e/* require */(" + (depBlock.chunk && depBlock.chunk.id || 0) + asComment(depBlock.chunkReason) + ", function(require) {(");
		source.replace(depBlock.functionRange[1], depBlock.range[1]-1, "(require, exports, module));})");
	} else if(depBlock.arrayRange && depBlock.functionRange) {
		source.replace(depBlock.range[0], depBlock.arrayRange[0]-1, 
			"require.e/* require */(" + (depBlock.chunk && depBlock.chunk.id || 0) + asComment(depBlock.chunkReason) + ", function(require) { var __WEBPACK_AMD_REQUIRE_ARRAY__ = ");
		source.replace(depBlock.arrayRange[1], depBlock.functionRange[0]-1, "; (");
		source.replace(depBlock.functionRange[1], depBlock.range[1]-1, ".apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));})");
	}
}

function asComment(str) {
	if(!str) return "";
	return "/* " + str + " */";
}
