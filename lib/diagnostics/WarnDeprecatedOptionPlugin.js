/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const DeprecatedOptionWarning = require("../errors/DeprecatedOptionWarning");

/** @import Compiler from "../Compiler" */

const PLUGIN_NAME = "WarnDeprecatedOptionPlugin";

class WarnDeprecatedOptionPlugin {
	/**
	 * Create an instance of the plugin
	 * @param {string} option the target option
	 * @param {string | number} value the deprecated option value
	 * @param {string} suggestion the suggestion replacement
	 */
	constructor(option, value, suggestion) {
		/** @type {string} */
		this.option = option;
		/** @type {string | number} */
		this.value = value;
		/** @type {string} */
		this.suggestion = suggestion;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.warnings.push(
				new DeprecatedOptionWarning(this.option, this.value, this.suggestion)
			);
		});
	}
}

module.exports = WarnDeprecatedOptionPlugin;
