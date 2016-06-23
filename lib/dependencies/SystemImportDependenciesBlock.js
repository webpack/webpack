/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
var SystemImportDependency = require("./SystemImportDependency");

var nameCountMap = {};

function SystemImportDependenciesBlock(request, range, module, loc) {
	var name = request + '';
	if (nameCountMap.hasOwnProperty(request)) {
		name += '-' + ++nameCountMap[request];
	} else {
		nameCountMap[request] = 1;
	}
	AsyncDependenciesBlock.call(this, name, module, loc);
	this.range = range;
	var dep = new SystemImportDependency(request, this);
	dep.loc = loc;
	this.addDependency(dep);
}
module.exports = SystemImportDependenciesBlock;

SystemImportDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);
SystemImportDependenciesBlock.prototype.constructor = SystemImportDependenciesBlock;
