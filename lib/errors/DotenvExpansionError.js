/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * Error for dotenv variables whose expansion goes past a limit, such as a
 * chain of variables that each reference the previous one twice, or
 * variables that reference each other in a cycle.
 */
class DotenvExpansionError extends WebpackError {
	/**
	 * @param {string} key name of the variable whose expansion hit the limit
	 * @param {string} problem which limit it hit
	 */
	constructor(key, problem) {
		super(
			`Expanding the dotenv variable ${key} ${problem}.\nCheck for variables that reference other variables many times or in a cycle.`
		);

		this.name = "DotenvExpansionError";
		/** @type {string} */
		this.key = key;
	}
}

module.exports = DotenvExpansionError;
