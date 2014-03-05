/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ExternalModuleFactoryDecorator = require("./ExternalModuleFactoryDecorator");

function ExternalsPlugin(type, externals) {
	this.type = type;
	this.externals = externals;
}
module.exports = ExternalsPlugin;
ExternalsPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compile", function(params) {
		params.normalModuleFactory = new ExternalModuleFactoryDecorator(params.normalModuleFactory, this.type, this.externals);
	}.bind(this));
};