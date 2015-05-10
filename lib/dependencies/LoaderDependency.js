/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function LoaderDependency(request) {
	ModuleDependency.call(this, request);
	this.Class = LoaderDependency;
}
module.exports = LoaderDependency;

LoaderDependency.prototype = Object.create(ModuleDependency.prototype);
LoaderDependency.prototype.constructor = LoaderDependency;
LoaderDependency.prototype.type = "loader";
