/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const WebpackError = require("./WebpackError");

class NonErrorEmittedError extends WebpackError {
	/**
	 * @param {EXPECTED_ANY} error value which is not an instance of Error
	 */
	constructor(error) {
		super();

		this.name = "NonErrorEmittedError";
		this.message = `(Emitted value instead of an instance of Error) ${error}`;
	}
}

makeSerializable(
	NonErrorEmittedError,
	"webpack/lib/errors/NonErrorEmittedError"
);

module.exports = NonErrorEmittedError;
