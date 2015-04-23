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
MultiModuleFactory.prototype.create = function(context, dependency, callback) {
	callback(null, new MultiModule(context, dependency.dependencies, dependency.name));
};
