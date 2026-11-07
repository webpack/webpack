/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * Error for dotenv variables whose expansion grows past the limit, such as a
 * chain of variables that each reference the previous one twice.
 */
class DotenvExpansionError extends WebpackError {
	/**
	 * @param {string} key name of the variable whose expansion hit the limit
	 * @param {number} limit maximum number of characters expansion may add
	 */
	constructor(key, limit) {
		super(
			`Expanding the dotenv variable ${key} adds more than ${limit} characters to the dotenv values in total.\nCheck for variables that reference other variables many times.`
		);

		this.name = "DotenvExpansionError";
		/** @type {string} */
		this.key = key;
	}
}

module.exports = DotenvExpansionError;
