/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/
"use strict";

const WebpackError = require("./WebpackError");

module.exports = class HarmonyLinkingError extends WebpackError {
	/** @param {string} message Error message */
	constructor(message) {
		super();
		this.name = "HarmonyLinkingError";
		this.message = message;
		this.hideStack = true;

		Error.captureStackTrace(this, this.constructor);
	}
};
