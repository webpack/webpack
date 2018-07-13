/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("./Compiler")} Compiler */

class NoEmitOnErrorsPlugin {
	/**
	 * @param {Compiler} compiler Webpack Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.shouldEmit.tap("NoEmitOnErrorsPlugin", compilation => {
			if (compilation.getStats().hasErrors()) return false;
		});
		compiler.hooks.compilation.tap("NoEmitOnErrorsPlugin", compilation => {
			compilation.hooks.shouldRecord.tap("NoEmitOnErrorsPlugin", () => {
				if (compilation.getStats().hasErrors()) return false;
			});
		});
	}
}

module.exports = NoEmitOnErrorsPlugin;
