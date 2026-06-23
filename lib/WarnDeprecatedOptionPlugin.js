/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const WebpackError = require("./errors/WebpackError");

/** @typedef {import("./Compiler")} Compiler */

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

class DeprecatedOptionWarning extends WebpackError {
	/**
	 * Create an instance deprecated option warning
	 * @param {string} option the target option
	 * @param {string | number} value the deprecated option value
	 * @param {string} suggestion the suggestion replacement
	 */
	constructor(option, value, suggestion) {
		super();

		/** @type {string} */
		this.name = "DeprecatedOptionWarning";
		/** @type {string} */
		this.message =
			"configuration\n" +
			`The value '${value}' for option '${option}' is deprecated. ` +
			`Use '${suggestion}' instead.`;
	}
}

module.exports = WarnDeprecatedOptionPlugin;
