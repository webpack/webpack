/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const EvalSourceMapDevToolModuleTemplatePlugin = require("./EvalSourceMapDevToolModuleTemplatePlugin");
const SourceMapDevToolModuleOptionsPlugin = require("./SourceMapDevToolModuleOptionsPlugin");

/** @typedef {import("./Compiler")} Compiler */

class EvalSourceMapDevToolPlugin {
	/**
	 * @param {TODO} options Options object
	 */
	constructor(options = {}) {
		if (typeof options === "string") {
			options = {
				append: options
			};
		}
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
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
