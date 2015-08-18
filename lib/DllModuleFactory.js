/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Tapable = require("tapable");
var DllModule = require("./DllModule");

function DllModuleFactory() {
	Tapable.call(this);
}
module.exports = DllModuleFactory;

DllModuleFactory.prototype = Object.create(Tapable.prototype);
DllModuleFactory.prototype.constructor = DllModuleFactory;

DllModuleFactory.prototype.create = function(context, dependency, callback) {
	callback(null, new DllModule(context, dependency.dependencies, dependency.name, dependency.type));
};
