/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");
var DepBlockHelpers = require("./DepBlockHelpers");

function AMDRequireDependency(block) {
	NullDependency.call(this);
	this.block = block;
}
module.exports = AMDRequireDependency;

AMDRequireDependency.prototype = Object.create(NullDependency.prototype);
AMDRequireDependency.prototype.constructor = AMDRequireDependency;

AMDRequireDependency.Template = function AMDRequireDependencyTemplate() {};

AMDRequireDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var depBlock = dep.block;
	var wrapper = DepBlockHelpers.getLoadDepBlockWrapper(depBlock, outputOptions, requestShortener, "require");
	if(depBlock.arrayRange && !depBlock.functionRange) {
		if(wrapper) {
			source.replace(depBlock.outerRange[0], depBlock.arrayRange[0] - 1,
				wrapper[0] + "function() {");
			source.replace(depBlock.arrayRange[1], depBlock.outerRange[1] - 1, ";}" + wrapper[1]);
		} else {
			source.replace(depBlock.outerRange[0], depBlock.arrayRange[0] - 1,
				"!/* require */(" + asComment(depBlock.chunkReason));
			source.replace(depBlock.arrayRange[1], depBlock.outerRange[1] - 1, ")");
		}
	} else if(!depBlock.arrayRange && depBlock.functionRange) {
		if(wrapper) {
			source.replace(depBlock.outerRange[0], depBlock.functionRange[0] - 1,
				wrapper[0] + "function(__webpack_require__) {(");
			source.replace(depBlock.functionRange[1], depBlock.outerRange[1] - 1, ".call(exports, __webpack_require__, exports, module));}" + wrapper[1]);
		} else {
			source.replace(depBlock.outerRange[0], depBlock.functionRange[0] - 1,
				"!/* require */(" + asComment(depBlock.chunkReason));
			source.replace(depBlock.functionRange[1], depBlock.outerRange[1] - 1, ".call(exports, __webpack_require__, exports, module))");
		}
	} else if(depBlock.arrayRange && depBlock.functionRange) {
		if(wrapper) {
			source.replace(depBlock.outerRange[0], depBlock.arrayRange[0] - 1,
				wrapper[0] + "function(__webpack_require__) { ");
			source.insert(depBlock.arrayRange[0] + 0.9, "var __WEBPACK_AMD_REQUIRE_ARRAY__ = ");
			source.replace(depBlock.arrayRange[1], depBlock.functionRange[0] - 1, "; (");
			source.insert(depBlock.functionRange[1], ".apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));");
			source.replace(depBlock.functionRange[1], depBlock.outerRange[1] - 1, "}" + (depBlock.bindThis ? ".bind(this)" : "") + wrapper[1]);
		} else {
			source.replace(depBlock.outerRange[0], depBlock.arrayRange[0] - 1,
				"!/* require */(" + asComment(depBlock.chunkReason) + "function() { ");
			source.insert(depBlock.arrayRange[0] + 0.9, "var __WEBPACK_AMD_REQUIRE_ARRAY__ = ");
			source.replace(depBlock.arrayRange[1], depBlock.functionRange[0] - 1, "; (");
			source.insert(depBlock.functionRange[1], ".apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));");
			source.replace(depBlock.functionRange[1], depBlock.outerRange[1] - 1, "}" + (depBlock.bindThis ? ".call(this)" : "()") + ")");
		}
	}
};

function asComment(str) {
	if(!str) return "";
	return "/* " + str + " */";
}
