/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var FunctionModuleTemplate = require("./FunctionModuleTemplate");
var RequestShortener = require("./RequestShortener");

function FunctionModulePlugin(context, options) {
	this.context = context;
	this.options = options;
}
module.exports = FunctionModulePlugin;
FunctionModulePlugin.prototype.apply = function(compiler) {
	compiler.moduleTemplate = new FunctionModuleTemplate(this.options, new RequestShortener(this.context));
};