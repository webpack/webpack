/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var FunctionModuleTemplate = require("./FunctionModuleTemplate");
var RequestShortener = require("./RequestShortener");

function FunctionModulePlugin(options, requestShortener) {
	this.options = options;
	this.requestShortener = requestShortener;
}
module.exports = FunctionModulePlugin;
FunctionModulePlugin.prototype.apply = function(compiler) {
	compiler.moduleTemplate = new FunctionModuleTemplate(this.options, this.requestShortener || new RequestShortener(compiler.context));
};