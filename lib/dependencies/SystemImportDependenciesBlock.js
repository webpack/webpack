/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
var SystemImportDependency = require("./SystemImportDependency");

function SystemImportDependenciesBlock(request, range, module, loc) {
	AsyncDependenciesBlock.call(this, null, module, loc);
	this.range = range;
	var dep = new SystemImportDependency(request, this);
	dep.loc = loc;
	this.addDependency(dep);
}
module.exports = SystemImportDependenciesBlock;

SystemImportDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);
SystemImportDependenciesBlock.prototype.constructor = SystemImportDependenciesBlock;
