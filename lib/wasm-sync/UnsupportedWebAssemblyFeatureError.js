/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import WebpackError from "../errors/WebpackError.js";

class UnsupportedWebAssemblyFeatureError extends WebpackError {
	/**
	 * Creates an instance of UnsupportedWebAssemblyFeatureError.
	 * @param {string} message Error message
	 */
	constructor(message) {
		super(message);

		/** @type {string} */
		this.name = "UnsupportedWebAssemblyFeatureError";
		/** @type {boolean} */
		this.hideStack = true;
	}
}

export default UnsupportedWebAssemblyFeatureError;

export { UnsupportedWebAssemblyFeatureError as "module.exports" };
