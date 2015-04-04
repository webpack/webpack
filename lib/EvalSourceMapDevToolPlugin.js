/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var EvalSourceMapDevToolModuleTemplatePlugin = require("./EvalSourceMapDevToolModuleTemplatePlugin");
var SourceMapDevToolModuleOptionsPlugin = require("./SourceMapDevToolModuleOptionsPlugin");

function EvalSourceMapDevToolPlugin(options, moduleFilenameTemplate) {
	if(!options || typeof options !== "object") {
		this.options = {
			append: options,
			moduleFilenameTemplate: moduleFilenameTemplate
		};
	} else {
		this.options = options;
	}
}
module.exports = EvalSourceMapDevToolPlugin;
EvalSourceMapDevToolPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("compilation", function(compilation) {
		new SourceMapDevToolModuleOptionsPlugin(options).apply(compilation);
		compilation.moduleTemplate.apply(new EvalSourceMapDevToolModuleTemplatePlugin(compilation, options, options.append, options.moduleFilenameTemplate));
	});
};
