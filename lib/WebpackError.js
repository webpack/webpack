/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jarid Margolin @jaridmargolin
*/
"use strict";

module.exports = class WebpackError extends Error {
	constructor(message) {
		super(message);

		this.details = undefined;

		Error.captureStackTrace(this, this.constructor);
	}

	inspect() {
		return this.stack + (this.details ? `\n${this.details}` : "");
	}
};
