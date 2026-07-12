/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import WebpackError from "./WebpackError.js";

class NonErrorEmittedError extends WebpackError {
	/**
	 * @param {EXPECTED_ANY} error value which is not an instance of Error
	 */
	constructor(error) {
		super();

		/** @type {string} */
		this.name = "NonErrorEmittedError";
		/** @type {string} */
		this.message = `(Emitted value instead of an instance of Error) ${error}`;
	}
}

makeSerializable(
	NonErrorEmittedError,
	"webpack/lib/errors/NonErrorEmittedError"
);

export default NonErrorEmittedError;

export { NonErrorEmittedError as "module.exports" };
