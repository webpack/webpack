/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");

module.exports = class NoModeWarning extends WebpackError {
	constructor(modules) {
		super();

		this.name = "NoModeWarning";
		this.message =
			"configuration\n" +
			"The 'mode' option has not been set. " +
			"Set 'mode' option to 'development' or 'production' to enable defaults for this environment. ";

		Error.captureStackTrace(this, this.constructor);
	}
};
