/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/** @typedef {import("./Compiler.js").default} Compiler */

const PLUGIN_NAME = "NoEmitOnErrorsPlugin";

class NoEmitOnErrorsPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.shouldEmit.tap(PLUGIN_NAME, (compilation) => {
			if (compilation.getStats().hasErrors()) return false;
		});
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.shouldRecord.tap(PLUGIN_NAME, () => {
				if (compilation.getStats().hasErrors()) return false;
			});
		});
	}
}

export default NoEmitOnErrorsPlugin;

export { NoEmitOnErrorsPlugin as "module.exports" };
