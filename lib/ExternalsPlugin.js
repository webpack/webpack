/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ExternalModuleFactoryPlugin = require("./ExternalModuleFactoryPlugin");

function ExternalsPlugin(type, externals) {
	this.type = type;
	this.externals = externals;
}
module.exports = ExternalsPlugin;
ExternalsPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compile", function(params) {
		params.normalModuleFactory.apply(new ExternalModuleFactoryPlugin(this.type, this.externals));
	}.bind(this));
};
