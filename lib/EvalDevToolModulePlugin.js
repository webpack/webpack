/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var EvalDevToolModuleTemplateDecorator = require("./EvalDevToolModuleTemplateDecorator");

function EvalDevToolModulePlugin(sourceUrlComment) {
	this.sourceUrlComment = sourceUrlComment;
}
module.exports = EvalDevToolModulePlugin;
EvalDevToolModulePlugin.prototype.apply = function(compiler) {
	var sourceUrlComment = this.sourceUrlComment;
	compiler.plugin("compilation", function(compilation) {
		compilation.moduleTemplate = new EvalDevToolModuleTemplateDecorator(compilation.moduleTemplate, sourceUrlComment);
	});
};