/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/** @typedef {import("./Compiler.js").default} Compiler */
/** @typedef {import("./Compilation.js").default} Compilation */

/** @typedef {(warning: Error, compilation: Compilation) => boolean} IgnoreFn */

const PLUGIN_NAME = "IgnoreWarningsPlugin";

class IgnoreWarningsPlugin {
	/**
	 * Creates an instance of IgnoreWarningsPlugin.
	 * @param {IgnoreFn[]} ignoreWarnings conditions to ignore warnings
	 */
	constructor(ignoreWarnings) {
		/** @type {IgnoreFn[]} */
		this._ignoreWarnings = ignoreWarnings;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processWarnings.tap(PLUGIN_NAME, (warnings) =>
				warnings.filter(
					(warning) =>
						!this._ignoreWarnings.some((ignore) => ignore(warning, compilation))
				)
			);
		});
	}
}

export default IgnoreWarningsPlugin;

export { IgnoreWarningsPlugin as "module.exports" };
