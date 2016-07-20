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

DllModuleFactory.prototype.create = function(data, callback) {
	var dependency = data.dependencies[0];
	callback(null, new DllModule(data.context, dependency.dependencies, dependency.name, dependency.type));
};
