/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import WebpackError from "../errors/WebpackError.js";

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

export default HarmonyLinkingError;

export { HarmonyLinkingError as "module.exports" };
