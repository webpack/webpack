/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var EvalSourceMapDevToolModuleTemplatePlugin = require("./EvalSourceMapDevToolModuleTemplatePlugin");
var SourceMapDevToolModuleOptionsPlugin = require("./SourceMapDevToolModuleOptionsPlugin");

function EvalSourceMapDevToolPlugin(options) {
	if(arguments.length > 1)
		throw new Error("EvalSourceMapDevToolPlugin only takes one argument (pass an options object)");
	if(typeof options === "string") {
		options = {
			append: options
		};
	}
	if(!options) options = {};
	this.options = options;
}
module.exports = EvalSourceMapDevToolPlugin;
EvalSourceMapDevToolPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("compilation", function(compilation) {
		new SourceMapDevToolModuleOptionsPlugin(options).apply(compilation);
		compilation.moduleTemplate.apply(new EvalSourceMapDevToolModuleTemplatePlugin(compilation, options));
	});
};
