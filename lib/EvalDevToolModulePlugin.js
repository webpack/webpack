/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const EvalDevToolModuleTemplatePlugin = require("./EvalDevToolModuleTemplatePlugin");

/** @typedef {import("./Compiler")} Compiler */

class EvalDevToolModulePlugin {
	constructor(options) {
		this.sourceUrlComment = options.sourceUrlComment;
		this.moduleFilenameTemplate = options.moduleFilenameTemplate;
		this.namespace = options.namespace;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("EvalDevToolModulePlugin", compilation => {
			new EvalDevToolModuleTemplatePlugin({
				compilation,
				sourceUrlComment: this.sourceUrlComment,
				moduleFilenameTemplate: this.moduleFilenameTemplate,
				namespace: this.namespace
			}).apply(compilation.moduleTemplates.javascript);
		});
	}
}

module.exports = EvalDevToolModulePlugin;
