/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class PathVariableError extends WebpackError {
	/**
	 * Creates an instance of PathVariableError.
	 * @param {string} variable the placeholder that has no value here, e.g. `[contenthash:8]`
	 * @param {string} template the path template the placeholder appears in
	 */
	constructor(variable, template) {
		super(
			`Path variable ${variable} not implemented in this context: ${template}`
		);

		/** @type {string} */
		this.name = "PathVariableError";
		/** @type {string} */
		this.variable = variable;
		/** @type {string} */
		this.template = template;
	}
}

/** @type {typeof PathVariableError} */
module.exports = PathVariableError;
