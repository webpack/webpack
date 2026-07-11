/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("./WebpackError");

class LoaderLoadingError extends WebpackError {
	/**
	 * @param {string} message message
	 */
	constructor(message) {
		super(message);
		this.name = "LoaderRunnerError";
	}
}

module.exports = LoaderLoadingError;
