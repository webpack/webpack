/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");

/** @typedef {import("./Module")} Module */

class NoModeWarning extends WebpackError {
	/**
	 * @param {Module[]=} modules modules used
	 */
	// TODO: Do we need this modules argument from constructor if its not used?
	constructor(modules) {
		super();

		this.name = "NoModeWarning";
		this.message =
			"configuration\n" +
			"The 'mode' option has not been set, webpack will fallback to 'production' for this value. " +
			"Set 'mode' option to 'development' or 'production' to enable defaults for each environment.\n" +
			"You can also set it to 'none' to disable any default behavior. " +
			"Learn more: https://webpack.js.org/concepts/mode/";

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = NoModeWarning;
