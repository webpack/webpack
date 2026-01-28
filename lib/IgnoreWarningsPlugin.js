/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../declarations/WebpackOptions").IgnoreWarningsNormalized} IgnoreWarningsNormalized */
/** @typedef {import("./Compiler")} Compiler */

const PLUGIN_NAME = "IgnoreWarningsPlugin";

class IgnoreWarningsPlugin {
	/**
	 * @param {IgnoreWarningsNormalized} ignoreWarnings conditions to ignore warnings
	 */
	constructor(ignoreWarnings) {
		this._ignoreWarnings = ignoreWarnings;
	}

	/**
	 * Apply the plugin
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

module.exports = IgnoreWarningsPlugin;
