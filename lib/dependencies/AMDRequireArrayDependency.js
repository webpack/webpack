/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Dependency = require("../Dependency");

function AMDRequireArrayDependency(depsArray, range) {
	Dependency.call(this);
	this.Class = AMDRequireArrayDependency;
	this.depsArray = depsArray;
	this.range = range;
}
module.exports = AMDRequireArrayDependency;

AMDRequireArrayDependency.prototype = Object.create(Dependency.prototype);
AMDRequireArrayDependency.prototype.type = "amd require array";

AMDRequireArrayDependency.Template = function AMDRequireArrayDependencyTemplate() {};

AMDRequireArrayDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var content = "[" + dep.depsArray.map(function(dep) {
		if(typeof dep === "string") {
			return dep;
		} else {
			var comment = "";
			if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
			if(dep.module)
				return "__webpack_require__(" + comment + dep.module.id + ")";
			else
				return require("./WebpackMissingModule").module(dep.request);
		}
	}).join(", ") + "]";
	source.replace(dep.range[0], dep.range[1]-1, content);
};
