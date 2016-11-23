/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Tapable = require("tapable");
var MultiModule = require("./MultiModule");

function MultiModuleFactory() {
	Tapable.call(this);
}
module.exports = MultiModuleFactory;

MultiModuleFactory.prototype = Object.create(Tapable.prototype);
MultiModuleFactory.prototype.constructor = MultiModuleFactory;

MultiModuleFactory.prototype.create = function(data, callback) {
	var dependency = data.dependencies[0];
	callback(null, new MultiModule(data.context, dependency.dependencies, dependency.name));
};
