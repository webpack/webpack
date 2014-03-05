/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ExternalModule = require("./ExternalModule");

function ExternalModuleFactoryDecorator(factory, type, externals) {
	this.factory = factory;
	this.type = type;
	this.externals = externals;
}
module.exports = ExternalModuleFactoryDecorator;

ExternalModuleFactoryDecorator.prototype.plugin = function() {
	return this.factory.plugin.apply(this.factory, arguments);
};

ExternalModuleFactoryDecorator.prototype.create = function(context, dependency, callback) {
	if(Object.prototype.hasOwnProperty.call(this.externals, dependency.request)) {
		var value = this.externals[dependency.request];
		if(value === true) value = dependency.request;
		return callback(null, new ExternalModule(value, this.type));
	}
	return this.factory.create(context, dependency, callback);
};
