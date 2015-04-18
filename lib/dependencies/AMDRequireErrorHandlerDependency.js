/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	Modified by Richard Scarrott @richardscarrott
*/
var NullDependency = require("./NullDependency");
var DepBlockHelpers = require("./DepBlockHelpers");

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
	var wrapper = DepBlockHelpers.getLoadDepBlockWrapper(depBlock, outputOptions, requestShortener, "require");

	if(depBlock.arrayRange && !depBlock.successCallbackRange) {
		if(wrapper) {
			source.replace(depBlock.outerRange[0], depBlock.arrayRange[0]-1,
				wrapper[0] + "function() {");
			source.replace(depBlock.arrayRange[1], depBlock.outerRange[1]-1, ";}" + wrapper[1]);
		} else {
			source.replace(depBlock.outerRange[0], depBlock.arrayRange[0]-1,
				"!/* require */(" + asComment(depBlock.chunkReason));
			source.replace(depBlock.arrayRange[1], depBlock.outerRange[1]-1, ")");
		}
	} else if(!depBlock.arrayRange && depBlock.successCallbackRange) {
		if(wrapper) {
			source.replace(depBlock.outerRange[0], depBlock.successCallbackRange[0]-1,
				wrapper[0] + "function(__webpack_require__) {(");
			source.replace(depBlock.successCallbackRange[1], depBlock.outerRange[1]-1, ".call(exports, __webpack_require__, exports, module));}" + wrapper[1]);
		} else {
			source.replace(depBlock.outerRange[0], depBlock.successCallbackRange[0]-1,
				"!/* require */(" + asComment(depBlock.chunkReason));
			source.replace(depBlock.successCallbackRange[1], depBlock.outerRange[1]-1, ".call(exports, __webpack_require__, exports, module))");
		}
	} else if(depBlock.arrayRange && depBlock.successCallbackRange) {
		if(wrapper) {
			source.replace(depBlock.outerRange[0], depBlock.arrayRange[0]-1,
				wrapper[0] + "function(__webpack_require__) { ");
			source.insert(depBlock.arrayRange[0] + 0.9, "var __WEBPACK_AMD_REQUIRE_ARRAY__ = ");
			source.replace(depBlock.arrayRange[1], depBlock.successCallbackRange[0]-1, "; (");
			source.insert(depBlock.successCallbackRange[1], ".apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}");
			var start = depBlock.errorCallbackRange ? depBlock.errorCallbackRange[1] : depBlock.successCallbackRange[1];
			source.replace(start, depBlock.outerRange[1]-1, wrapper[1]);
		} else {
			source.replace(depBlock.outerRange[0], depBlock.arrayRange[0]-1,
				"!/* require */(" + asComment(depBlock.chunkReason) + "function() { ");
			source.insert(depBlock.arrayRange[0] + 0.9, "var __WEBPACK_AMD_REQUIRE_ARRAY__ = ");
			source.replace(depBlock.arrayRange[1], depBlock.successCallbackRange[0]-1, "; (");
			source.insert(depBlock.successCallbackRange[1], ".apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}");
			var start = depBlock.errorCallbackRange ? depBlock.errorCallbackRange[1] : depBlock.successCallbackRange[1];
			source.replace(start, depBlock.outerRange[1]-1, wrapper[1]);
		}
	}
};

function asComment(str) {
	if(!str) return "";
	return "/* " + str + " */";
}
