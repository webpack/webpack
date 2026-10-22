/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("./WebpackError");

class DllManifestError extends WebpackError {
	/**
	 * Creates an instance of DllManifestError.
	 * @param {string} filename filename of the manifest
	 * @param {string} message error message
	 */
	constructor(filename, message) {
		super();

		/** @type {string} */
		this.name = "DllManifestError";
		/** @type {string} */
		this.message = `Dll manifest ${filename}\n${message}`;
	}
}

module.exports = DllManifestError;
