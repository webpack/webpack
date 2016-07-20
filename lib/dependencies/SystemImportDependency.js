/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");
var DepBlockHelpers = require("./DepBlockHelpers");
var WebpackMissingModule = require("./WebpackMissingModule");

function SystemImportDependency(request, block) {
	ModuleDependency.call(this, request);
	this.block = block;
}
module.exports = SystemImportDependency;

SystemImportDependency.prototype = Object.create(ModuleDependency.prototype);
SystemImportDependency.prototype.constructor = SystemImportDependency;
SystemImportDependency.prototype.type = "System.import";

SystemImportDependency.Template = function SystemImportDependencyTemplate() {};

SystemImportDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener) {
	var depBlock = dep.block;
	var promise = DepBlockHelpers.getDepBlockPromise(depBlock, outputOptions, requestShortener, "System.import");
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
