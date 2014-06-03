/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var EvalDevToolModuleTemplatePlugin = require("./EvalDevToolModuleTemplatePlugin");

function EvalDevToolModulePlugin(sourceUrlComment) {
	this.sourceUrlComment = sourceUrlComment;
}
module.exports = EvalDevToolModulePlugin;
EvalDevToolModulePlugin.prototype.apply = function(compiler) {
	var self = this;
	compiler.plugin("compilation", function(compilation) {
		compilation.moduleTemplate.apply(new EvalDevToolModuleTemplatePlugin(self.sourceUrlComment));
	});
};