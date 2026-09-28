/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const WebpackError = require("./WebpackError");

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

module.exports = DeprecatedOptionWarning;
