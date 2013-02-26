/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NullDependency = require("./NullDependency");

function AMDDefineDependency(range, arrayRange, functionRange) {
	NullDependency.call(this);
	this.Class = AMDDefineDependency;
	this.range = range;
	this.arrayRange = arrayRange;
	this.functionRange = functionRange;
}
module.exports = AMDDefineDependency;

AMDDefineDependency.prototype = Object.create(NullDependency.prototype);
AMDDefineDependency.prototype.type = "amd define";

AMDDefineDependency.Template = function AMDRequireDependencyTemplate() {};

AMDDefineDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	if(dep.arrayRange && !dep.functionRange) {
		source.replace(dep.range[0], dep.arrayRange[0]-1,
			"module.exports = ");
		source.replace(dep.arrayRange[1], dep.range[1]-1, ";");
	} else if(!dep.arrayRange && dep.functionRange) {
		source.replace(dep.range[0], dep.functionRange[0]-1,
			"{var __WEBPACK_AMD_DEFINE_RESULT__ = (");
		source.replace(dep.functionRange[1], dep.range[1]-1, "(require, exports, module)); if(__WEBPACK_AMD_DEFINE_RESULT__ !== undefined) module.exports = __WEBPACK_AMD_DEFINE_RESULT__;}");
	} else if(dep.arrayRange && dep.functionRange) {
		source.replace(dep.range[0], dep.arrayRange[0]-1,
			"{var __WEBPACK_AMD_DEFINE_ARRAY__ = ");
		source.replace(dep.arrayRange[1], dep.functionRange[0]-1, "; var __WEBPACK_AMD_DEFINE_RESULT__ = (");
		source.replace(dep.functionRange[1], dep.range[1]-1, ".apply(null, __WEBPACK_AMD_DEFINE_ARRAY__)); if(__WEBPACK_AMD_DEFINE_RESULT__ !== undefined) module.exports = __WEBPACK_AMD_DEFINE_RESULT__;}");
	}
};
