/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * Error for a dotenv file that exists but could not be read. An absent file is
 * normal and reported through `missingDependencies` instead.
 */
class DotenvFileError extends WebpackError {
	/**
	 * @param {string} file path of the dotenv file
	 * @param {Error} error underlying file system error
	 */
	constructor(file, error) {
		super(`Unable to read the dotenv file ${file}\n${error.message}`);

		this.name = "DotenvFileError";
		/** @type {string} */
		this.file = file;
		this.error = error;
	}
}

module.exports = DotenvFileError;
