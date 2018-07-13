/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const EvalSourceMapDevToolModuleTemplatePlugin = require("./EvalSourceMapDevToolModuleTemplatePlugin");
const SourceMapDevToolModuleOptionsPlugin = require("./SourceMapDevToolModuleOptionsPlugin");

/** @typedef {import("./Compiler")} Compiler */

class EvalSourceMapDevToolPlugin {
	constructor(options) {
		if (arguments.length > 1) {
			throw new Error(
				"EvalSourceMapDevToolPlugin only takes one argument (pass an options object)"
			);
		}
		if (typeof options === "string") {
			options = {
				append: options
			};
		}
		if (!options) options = {};
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler Webpack Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap(
			"EvalSourceMapDevToolPlugin",
			compilation => {
				new SourceMapDevToolModuleOptionsPlugin(options).apply(compilation);
				new EvalSourceMapDevToolModuleTemplatePlugin(
					compilation,
					options
				).apply(compilation.moduleTemplates.javascript);
			}
		);
	}
}

module.exports = EvalSourceMapDevToolPlugin;
