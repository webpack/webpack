/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");
var DepBlockHelpers = require("./DepBlockHelpers");
var WebpackMissingModule = require("./WebpackMissingModule");

function ImportDependency(request, block) {
	ModuleDependency.call(this, request);
	this.block = block;
}
module.exports = ImportDependency;

ImportDependency.prototype = Object.create(ModuleDependency.prototype);
ImportDependency.prototype.constructor = ImportDependency;
ImportDependency.prototype.type = "import()";

ImportDependency.Template = function ImportDependencyTemplate() {};

ImportDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var depBlock = dep.block;
	var promise = DepBlockHelpers.getDepBlockPromise(depBlock, outputOptions, requestShortener, "import()");
	var comment = "";
	if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
	if(promise && dep.module) {
		source.replace(depBlock.range[0], depBlock.range[1] - 1, promise + ".then(__webpack_require__.bind(null, " + comment + JSON.stringify(dep.module.id) + "))");
	} else if(dep.module) {
		source.replace(depBlock.range[0], depBlock.range[1] - 1, "Promise.resolve(__webpack_require__(" + comment + JSON.stringify(dep.module.id) + "))");
	} else {
		source.replace(depBlock.range[0], depBlock.range[1] - 1, WebpackMissingModule.promise(dep.request));
	}
};
