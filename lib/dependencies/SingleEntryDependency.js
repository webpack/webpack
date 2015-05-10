/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function SingleEntryDependency(request) {
	ModuleDependency.call(this, request);
	this.Class = SingleEntryDependency;
}
module.exports = SingleEntryDependency;

SingleEntryDependency.prototype = Object.create(ModuleDependency.prototype);
SingleEntryDependency.prototype.constructor = SingleEntryDependency;
SingleEntryDependency.prototype.type = "single entry";
