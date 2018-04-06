/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jarid Margolin @jaridmargolin
*/
"use strict";

module.exports = class WebpackError extends Error {
	constructor(message) {
		super(message);
		this.name = 'WebpackError';
		this.message = message;
		Error.captureStackTrace(this, this.constructor);

		/** @type {string} */
		this.details = undefined;
	}

	inspect() {
		return this.stack + (this.details ? `\n${this.details}` : "");
	}
};
