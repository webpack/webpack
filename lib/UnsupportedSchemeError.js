/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const WebpackError = require("./WebpackError");
const makeSerializable = require("./util/makeSerializable");

class UnsupportedSchemeError extends WebpackError {
	/**
	 * @param {string} scheme scheme
	 * @param {string} specifier specifier
	 */
	constructor(scheme, specifier) {
		super(
			`Unsupported scheme ${JSON.stringify(
				scheme
			)} provided, specifier: ${specifier}.`
		);
		this.name = "UnsupportedSchemeError";
	}
}

makeSerializable(
	UnsupportedSchemeError,
	"webpack/lib/UnsupportedSchemeError",
	"UnsupportedSchemeError"
);

module.exports = UnsupportedSchemeError;
