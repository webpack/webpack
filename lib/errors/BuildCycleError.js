
"use strict";

class WebpackError extends Error {
	constructor(message, code) {
		super(message, "WEBPACK_MODULE_BUILD_ERROR");


		this.name = "WebpackError";
		this.code = code || "WEBPACK_ERROR";

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = WebpackError;
