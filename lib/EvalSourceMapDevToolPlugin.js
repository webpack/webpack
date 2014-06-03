/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var EvalSourceMapDevToolModuleTemplatePlugin = require("./EvalSourceMapDevToolModuleTemplatePlugin");

function EvalSourceMapDevToolPlugin(sourceMapComment) {
	this.sourceMapComment = sourceMapComment;
}
module.exports = EvalSourceMapDevToolPlugin;
EvalSourceMapDevToolPlugin.prototype.apply = function(compiler) {
	var sourceMapComment = this.sourceMapComment;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("build-module", function(module) {
			module.useSourceMap = true;
		});
		compilation.moduleTemplate.apply(new EvalSourceMapDevToolModuleTemplatePlugin(compilation, sourceMapComment));
	});
};