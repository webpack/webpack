/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const WebpackError = require("../errors/WebpackError");

class HarmonyLinkingError extends WebpackError {
	/** @param {string} message Error message */
	constructor(message) {
		super(message);
		/** @type {string} */
		this.name = "HarmonyLinkingError";
		this.hideStack = true;
	}
}

module.exports = HarmonyLinkingError;
