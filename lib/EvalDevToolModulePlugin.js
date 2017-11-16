/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const EvalDevToolModuleTemplatePlugin = require("./EvalDevToolModuleTemplatePlugin");

class EvalDevToolModulePlugin {
	constructor(options) {
		this.sourceUrlComment = options.sourceUrlComment;
		this.moduleFilenameTemplate = options.moduleFilenameTemplate;
		this.namespace = options.namespace;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.moduleTemplates.javascript.apply(new EvalDevToolModuleTemplatePlugin({
				sourceUrlComment: this.sourceUrlComment,
				moduleFilenameTemplate: this.moduleFilenameTemplate,
				namespace: this.namespace
			}));
		});
	}
}

module.exports = EvalDevToolModulePlugin;
