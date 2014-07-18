/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var EvalDevToolModuleTemplatePlugin = require("./EvalDevToolModuleTemplatePlugin");

function EvalDevToolModulePlugin(sourceUrlComment, moduleFilenameTemplate) {
	this.sourceUrlComment = sourceUrlComment;
	this.moduleFilenameTemplate = moduleFilenameTemplate;
}
module.exports = EvalDevToolModulePlugin;
EvalDevToolModulePlugin.prototype.apply = function(compiler) {
	var self = this;
	compiler.plugin("compilation", function(compilation) {
		compilation.moduleTemplate.apply(new EvalDevToolModuleTemplatePlugin(self.sourceUrlComment, self.moduleFilenameTemplate));
	});
};