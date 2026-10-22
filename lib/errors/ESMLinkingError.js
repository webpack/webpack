/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const WebpackError = require("./WebpackError");

class ESMLinkingError extends WebpackError {
	/** @param {string} message Error message */
	constructor(message) {
		super(message);
		/** @type {string} */
		this.name = "ESMLinkingError";
		/** @type {boolean} */
		this.hideStack = true;
	}
}

module.exports = ESMLinkingError;
