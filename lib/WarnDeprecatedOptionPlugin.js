/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const WebpackError = require("./WebpackError");

class WarnDeprecatedOptionPlugin {
	constructor(option, value, suggestion) {
		this.option = option;
		this.value = value;
		this.suggestion = suggestion;
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"WarnDeprecatedOptionPlugin",
			compilation => {
				compilation.warnings.push(
					new DeprecatedOptionWarning(this.option, this.value, this.suggestion)
				);
			}
		);
	}
}

class DeprecatedOptionWarning extends WebpackError {
	constructor(option, value, suggestion) {
		super();

		this.name = "DeprecatedOptionWarning";
		this.message =
			"configuration\n" +
			`The value '${value}' for option '${option}' is deprecated. ` +
			`Use '${suggestion}' instead.`;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = WarnDeprecatedOptionPlugin;
