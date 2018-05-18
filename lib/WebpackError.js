/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jarid Margolin @jaridmargolin
*/
"use strict";

class WebpackError extends Error {
	constructor(message) {
		super(message);

		this.details = undefined;
		this.missing = undefined;
		this.origin = undefined;
		this.dependencies = undefined;
		this.module = undefined;

		Error.captureStackTrace(this, this.constructor);
	}

	inspect() {
		return this.stack + (this.details ? `\n${this.details}` : "");
	}
}

module.exports = WebpackError;
