/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var FunctionModuleTemplatePlugin = require("./FunctionModuleTemplatePlugin");
var RequestShortener = require("./RequestShortener");

function FunctionModulePlugin(options, requestShortener) {
	this.options = options;
	this.requestShortener = requestShortener;
}
module.exports = FunctionModulePlugin;
FunctionModulePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.moduleTemplate.requestShortener = this.requestShortener || new RequestShortener(compiler.context);
		compilation.moduleTemplate.apply(new FunctionModuleTemplatePlugin());
	}.bind(this));
};
