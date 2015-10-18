/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleDependency = require("./ModuleDependency");

function PrefetchDependency(request) {
	ModuleDependency.call(this, request);
}
module.exports = PrefetchDependency;

PrefetchDependency.prototype = Object.create(ModuleDependency.prototype);
PrefetchDependency.prototype.constructor = PrefetchDependency;
PrefetchDependency.prototype.type = "prefetch";
