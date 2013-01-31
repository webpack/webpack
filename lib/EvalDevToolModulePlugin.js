/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var EvalDevToolModuleTemplateDecorator = require("./EvalDevToolModuleTemplateDecorator");

function EvalDevToolModulePlugin() {
}
module.exports = EvalDevToolModulePlugin;
EvalDevToolModulePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.moduleTemplate = new EvalDevToolModuleTemplateDecorator(compilation.moduleTemplate);
	});
};