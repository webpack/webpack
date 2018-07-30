/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jarid Margolin @jaridmargolin
*/

"use strict";

/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */

class WebpackError extends Error {
	/**
	 * Creates an instance of WebpackError.
	 * @param {string=} message error message
	 */
	constructor(message) {
		super(message);

		this.details = undefined;
		this.missing = undefined;
		this.origin = undefined;
		this.dependencies = undefined;
		this.module = undefined;
		/** @type {DependencyLocation} */
		this.loc = undefined;

		Error.captureStackTrace(this, this.constructor);
	}

	inspect() {
		return this.stack + (this.details ? `\n${this.details}` : "");
	}
}

module.exports = WebpackError;
