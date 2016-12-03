/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
var ImportDependency = require("./ImportDependency");

function ImportDependenciesBlock(request, range, module, loc) {
	AsyncDependenciesBlock.call(this, null, module, loc);
	this.range = range;
	var dep = new ImportDependency(request, this);
	dep.loc = loc;
	this.addDependency(dep);
}
module.exports = ImportDependenciesBlock;

ImportDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);
ImportDependenciesBlock.prototype.constructor = ImportDependenciesBlock;
