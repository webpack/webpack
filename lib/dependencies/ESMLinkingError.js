/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const WebpackError = require("../errors/WebpackError");

// TODO in the next major release: rename to `ESMLinkingError`
class HarmonyLinkingError extends WebpackError {
	/** @param {string} message Error message */
	constructor(message) {
		super(message);
		/** @type {string} */
		this.name = "HarmonyLinkingError";
		/** @type {boolean} */
		this.hideStack = true;
	}
}

module.exports = HarmonyLinkingError;
