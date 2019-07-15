"use strict";

const WebpackError = require("./WebpackError");
const CURRENT_METHOD_REGEXP = /at ([a-zA-Z0-9_.]*)/;

/**
 * @param {string=} method method name
 * @returns {string} message
 */
function createMessage(method) {
	return `Abstract method${method ? " " + method : ""}. Must be overriden.`;
}

/**
 * Error for abstract method
 * @example
 * class FooClass {
 *     abstractMethod() {
 *         throw new AbstractMethodError(); // error message: Abstract method FooClass.abstractMethod. Must be overriden.
 *     }
 * }
 *
 */
class AbstractMethodError extends WebpackError {
	constructor() {
		super(createMessage());
		this.name = "AbstractMethodError";
		/** @type {RegExpMatchArray} */
		const match = this.stack.split("\n")[1].match(CURRENT_METHOD_REGEXP);
		if (match && match[1]) {
			this.message = createMessage(match[1]);
		}
	}
}

module.exports = AbstractMethodError;
