/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class LoadingLoaderError extends Error {
	/**
	 * @param {string} message message
	 */
	constructor(message) {
		super(message);
		this.name = "LoaderRunnerError";
	}
}

module.exports = LoadingLoaderError;
