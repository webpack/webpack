/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const EvalSourceMapDevToolModuleTemplatePlugin = require("./EvalSourceMapDevToolModuleTemplatePlugin");
const SourceMapDevToolModuleOptionsPlugin = require("./SourceMapDevToolModuleOptionsPlugin");

class EvalSourceMapDevToolPlugin {
	constructor(options) {
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

	apply(compiler) {
		let options = this.options;
		compiler.plugin("compilation", (compilation) => {
			new SourceMapDevToolModuleOptionsPlugin(options).apply(compilation);
			compilation.moduleTemplate.apply(new EvalSourceMapDevToolModuleTemplatePlugin(compilation, options));
		});
	}
}

module.exports = EvalSourceMapDevToolPlugin;
